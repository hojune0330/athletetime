import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

type Bindings = {
  DB: D1Database;
}

export const schedulesRoutes = new Hono<{ Bindings: Bindings }>()

// Validation schemas
const createCompetitionSchema = z.object({
  title: z.string().min(1).max(200),
  short_title: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string(), // YYYY-MM-DD format
  end_date: z.string(),
  venue: z.string().min(1).max(200),
  venue_address: z.string().optional(),
  organizer: z.string().optional(),
  host: z.string().optional(),
  category: z.enum(['elementary', 'middle', 'high', 'college', 'professional', 'masters', 'general'])
})

const createEventSchema = z.object({
  competition_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  category: z.enum(['track', 'field']),
  gender: z.enum(['male', 'female', 'mixed']),
  age_group: z.string().optional(),
  record_type: z.enum(['time', 'distance', 'height', 'points']).default('time'),
  unit: z.enum(['seconds', 'meters', 'points']).default('seconds')
})

const createScheduleSchema = z.object({
  event_id: z.number().int().positive(),
  scheduled_time: z.string(), // ISO datetime string
  round_type: z.string().min(1),
  round_name: z.string().optional(),
  participant_count: z.number().int().min(0).default(0),
  lane_count: z.number().int().min(0).default(8),
  field_location: z.string().optional(),
  notes: z.string().optional()
})

// Get competitions with filtering
schedulesRoutes.get('/competitions', async (c) => {
  const category = c.req.query('category')
  const status = c.req.query('status') || 'all'
  const featured = c.req.query('featured') === 'true'
  const upcoming = c.req.query('upcoming') === 'true'

  try {
    let query = `
      SELECT 
        id, title, short_title, description, start_date, end_date,
        venue, venue_address, organizer, host, category, status,
        is_featured, participant_count, event_count,
        created_at, updated_at
      FROM competitions
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }
    
    if (status !== 'all') {
      query += ` AND status = ?`
      params.push(status)
    }
    
    if (featured) {
      query += ` AND is_featured = true`
    }
    
    if (upcoming) {
      query += ` AND start_date >= date('now')`
    }
    
    query += ` ORDER BY is_featured DESC, start_date ASC`
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    console.error('Failed to fetch competitions:', error)
    return c.json({ success: false, error: 'Failed to fetch competitions' }, 500)
  }
})

// Get single competition with events
schedulesRoutes.get('/competitions/:id', async (c) => {
  const competitionId = c.req.param('id')
  
  try {
    // Get competition
    const competition = await c.env.DB.prepare(`
      SELECT * FROM competitions WHERE id = ?
    `).bind(competitionId).first()
    
    if (!competition) {
      return c.json({ success: false, error: 'Competition not found' }, 404)
    }
    
    // Get events
    const events = await c.env.DB.prepare(`
      SELECT 
        e.*,
        COUNT(s.id) as schedule_count,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_count
      FROM events e
      LEFT JOIN schedules s ON e.id = s.event_id
      WHERE e.competition_id = ?
      GROUP BY e.id
      ORDER BY e.category, e.name
    `).bind(competitionId).all()
    
    return c.json({
      success: true,
      data: {
        competition,
        events: events.results
      }
    })
  } catch (error) {
    console.error('Failed to fetch competition:', error)
    return c.json({ success: false, error: 'Failed to fetch competition' }, 500)
  }
})

// Get schedules with filtering
schedulesRoutes.get('/schedules', async (c) => {
  const competitionId = c.req.query('competition_id')
  const eventId = c.req.query('event_id')
  const date = c.req.query('date') // YYYY-MM-DD
  const status = c.req.query('status')
  const live = c.req.query('live') === 'true'

  try {
    let query = `
      SELECT 
        s.*,
        e.name as event_name,
        e.category as event_category,
        e.gender,
        e.age_group,
        c.title as competition_title,
        c.venue
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN competitions c ON e.competition_id = c.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (competitionId) {
      query += ` AND c.id = ?`
      params.push(competitionId)
    }
    
    if (eventId) {
      query += ` AND e.id = ?`
      params.push(eventId)
    }
    
    if (date) {
      query += ` AND date(s.scheduled_time) = ?`
      params.push(date)
    }
    
    if (status) {
      query += ` AND s.status = ?`
      params.push(status)
    }
    
    if (live) {
      query += ` AND s.is_live = true`
    }
    
    query += ` ORDER BY s.scheduled_time ASC`
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
    return c.json({ success: false, error: 'Failed to fetch schedules' }, 500)
  }
})

// Get today's live schedule (실시간 시간표)
schedulesRoutes.get('/schedules/today', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        s.*,
        e.name as event_name,
        e.category as event_category,
        e.gender,
        e.age_group,
        c.title as competition_title,
        c.venue,
        CASE 
          WHEN s.status = 'ongoing' THEN 1
          WHEN s.status = 'scheduled' AND datetime(s.scheduled_time) <= datetime('now', '+1 hour') THEN 2
          WHEN s.status = 'scheduled' THEN 3
          WHEN s.status = 'completed' THEN 4
          ELSE 5
        END as priority_order
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN competitions c ON e.competition_id = c.id
      WHERE date(s.scheduled_time) = date('now')
      ORDER BY priority_order ASC, s.scheduled_time ASC
      LIMIT 20
    `).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    console.error('Failed to fetch today schedules:', error)
    return c.json({ success: false, error: 'Failed to fetch today schedules' }, 500)
  }
})

// Get schedule with results
schedulesRoutes.get('/schedules/:id', async (c) => {
  const scheduleId = c.req.param('id')
  
  try {
    // Get schedule details
    const schedule = await c.env.DB.prepare(`
      SELECT 
        s.*,
        e.name as event_name,
        e.category as event_category,
        e.gender,
        e.age_group,
        e.record_type,
        e.unit,
        c.title as competition_title,
        c.venue
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN competitions c ON e.competition_id = c.id
      WHERE s.id = ?
    `).bind(scheduleId).first()
    
    if (!schedule) {
      return c.json({ success: false, error: 'Schedule not found' }, 404)
    }
    
    // Get results if completed or ongoing
    let results: any[] = []
    if (schedule.status === 'completed' || schedule.status === 'ongoing') {
      const resultsData = await c.env.DB.prepare(`
        SELECT 
          athlete_name, athlete_number, team_name, lane_number,
          performance, rank, status, is_record, record_type,
          reaction_time, wind_speed
        FROM results
        WHERE schedule_id = ?
        ORDER BY rank ASC, performance ASC
      `).bind(scheduleId).all()
      
      results = resultsData.results || []
    }
    
    return c.json({
      success: true,
      data: {
        schedule,
        results
      }
    })
  } catch (error) {
    console.error('Failed to fetch schedule details:', error)
    return c.json({ success: false, error: 'Failed to fetch schedule details' }, 500)
  }
})

// Create competition (admin only - for now just allow it)
schedulesRoutes.post('/competitions', zValidator('json', createCompetitionSchema), async (c) => {
  const data = c.req.valid('json')
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO competitions (
        title, short_title, description, start_date, end_date,
        venue, venue_address, organizer, host, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.title,
      data.short_title || null,
      data.description || null,
      data.start_date,
      data.end_date,
      data.venue,
      data.venue_address || null,
      data.organizer || null,
      data.host || null,
      data.category
    ).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id }
    })
  } catch (error) {
    console.error('Failed to create competition:', error)
    return c.json({ success: false, error: 'Failed to create competition' }, 500)
  }
})

// Create event
schedulesRoutes.post('/events', zValidator('json', createEventSchema), async (c) => {
  const data = c.req.valid('json')
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO events (
        competition_id, name, category, gender, age_group, record_type, unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.competition_id,
      data.name,
      data.category,
      data.gender,
      data.age_group || null,
      data.record_type,
      data.unit
    ).run()
    
    // Update competition event count
    await c.env.DB.prepare(`
      UPDATE competitions 
      SET event_count = event_count + 1 
      WHERE id = ?
    `).bind(data.competition_id).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id }
    })
  } catch (error) {
    console.error('Failed to create event:', error)
    return c.json({ success: false, error: 'Failed to create event' }, 500)
  }
})

// Create schedule
schedulesRoutes.post('/schedules', zValidator('json', createScheduleSchema), async (c) => {
  const data = c.req.valid('json')
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO schedules (
        event_id, scheduled_time, round_type, round_name,
        participant_count, lane_count, field_location, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.event_id,
      data.scheduled_time,
      data.round_type,
      data.round_name || null,
      data.participant_count,
      data.lane_count,
      data.field_location || null,
      data.notes || null
    ).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id }
    })
  } catch (error) {
    console.error('Failed to create schedule:', error)
    return c.json({ success: false, error: 'Failed to create schedule' }, 500)
  }
})

// Update schedule status (for live updates)
schedulesRoutes.patch('/schedules/:id/status', async (c) => {
  const scheduleId = c.req.param('id')
  const { status, is_live, notes } = await c.req.json()
  
  const validStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled', 'delayed']
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400)
  }
  
  try {
    await c.env.DB.prepare(`
      UPDATE schedules 
      SET status = ?, is_live = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, is_live || false, notes || null, scheduleId).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to update schedule status:', error)
    return c.json({ success: false, error: 'Failed to update schedule status' }, 500)
  }
})

// Get live updates (실시간 업데이트)
schedulesRoutes.get('/live', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        s.*,
        e.name as event_name,
        e.category as event_category,
        e.gender,
        c.title as competition_title,
        c.venue
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN competitions c ON e.competition_id = c.id
      WHERE s.is_live = true OR s.status = 'ongoing'
      ORDER BY s.scheduled_time ASC
    `).all()
    
    return c.json({ success: true, data: result.results })
  } catch (error) {
    console.error('Failed to fetch live updates:', error)
    return c.json({ success: false, error: 'Failed to fetch live updates' }, 500)
  }
})