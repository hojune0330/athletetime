import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// 기록 등록 스키마
const resultSchema = z.object({
  schedule_id: z.number(),
  event_name: z.string().min(1),
  round_name: z.string().optional(),
  lane_position: z.number().optional(),
  athlete_name: z.string().min(1),
  school_team: z.string().optional(),
  grade_age: z.string().optional(),
  result_value: z.string().min(1),
  result_numeric: z.number().optional(),
  rank_position: z.number().optional(),
  wind_speed: z.string().optional(),
  is_record: z.boolean().default(false),
  record_type: z.string().optional(),
  notes: z.string().optional()
})

// 개인 기록 등록 스키마
const personalRecordSchema = z.object({
  athlete_name: z.string().min(1),
  school_team: z.string().optional(),
  category: z.enum(['초등부', '중등부', '고등부', '대학부', '실업부', '마스터즈']),
  age_group: z.string().optional(),
  event_name: z.string().min(1),
  event_type: z.enum(['track', 'field']),
  record_value: z.string().min(1),
  record_numeric: z.number(),
  competition_name: z.string().optional(),
  record_date: z.string().optional(),
  wind_speed: z.string().optional(),
  is_verified: z.boolean().default(false)
})

// 1. 경기 결과 등록
app.post('/results', zValidator('json', resultSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const { DB } = c.env

    const result = await DB.prepare(`
      INSERT INTO competition_results (
        schedule_id, event_name, round_name, lane_position, 
        athlete_name, school_team, grade_age, result_value, 
        result_numeric, rank_position, wind_speed, is_record, 
        record_type, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.schedule_id, data.event_name, data.round_name, data.lane_position,
      data.athlete_name, data.school_team, data.grade_age, data.result_value,
      data.result_numeric, data.rank_position, data.wind_speed, data.is_record ? 1 : 0,
      data.record_type, data.notes
    ).run()

    // 실시간 업데이트 로그 추가
    await DB.prepare(`
      INSERT INTO result_updates (schedule_id, update_type, update_content)
      VALUES (?, 'result_add', ?)
    `).bind(
      data.schedule_id,
      `${data.athlete_name} (${data.school_team}) - ${data.event_name} ${data.result_value}`
    ).run()

    return c.json({
      success: true,
      result_id: result.meta.last_row_id,
      message: '결과가 등록되었습니다'
    })
  } catch (error) {
    console.error('Results registration error:', error)
    return c.json({ success: false, error: 'Failed to register result' }, 500)
  }
})

// 2. 종목별 결과 조회
app.get('/results/event/:eventName', async (c) => {
  try {
    const eventName = c.req.param('eventName')
    const round = c.req.query('round') // 예선, 준결승, 결승
    const { DB } = c.env

    let query = `
      SELECT cr.*, s.start_time, s.venue, comp.name as competition_name
      FROM competition_results cr
      JOIN schedules s ON cr.schedule_id = s.id
      JOIN competitions comp ON s.competition_id = comp.id
      WHERE cr.event_name = ?
    `
    const params: any[] = [eventName]

    if (round) {
      query += ` AND cr.round_name = ?`
      params.push(round)
    }

    query += ` ORDER BY cr.rank_position ASC, cr.result_numeric ASC`

    const results = await DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      event_name: eventName,
      round: round,
      results: results.results
    })
  } catch (error) {
    console.error('Results fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch results' }, 500)
  }
})

// 3. 대회별 전체 결과 조회
app.get('/results/competition/:competitionId', async (c) => {
  try {
    const competitionId = parseInt(c.req.param('competitionId'))
    const { DB } = c.env

    const results = await DB.prepare(`
      SELECT cr.*, s.start_time, s.venue, s.event_name as schedule_event
      FROM competition_results cr
      JOIN schedules s ON cr.schedule_id = s.id
      WHERE s.competition_id = ?
      ORDER BY s.start_time ASC, cr.event_name, cr.rank_position ASC
    `).bind(competitionId).all()

    // 종목별로 그룹화
    const groupedResults: Record<string, any[]> = {}
    results.results?.forEach((result: any) => {
      const key = `${result.event_name}_${result.round_name || 'final'}`
      if (!groupedResults[key]) {
        groupedResults[key] = []
      }
      groupedResults[key].push(result)
    })

    return c.json({
      success: true,
      competition_id: competitionId,
      results_by_event: groupedResults
    })
  } catch (error) {
    console.error('Competition results fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch competition results' }, 500)
  }
})

// 4. 개인 최고 기록 등록
app.post('/records/personal', zValidator('json', personalRecordSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const { DB } = c.env

    // 기존 기록 확인
    const existing = await DB.prepare(`
      SELECT * FROM personal_records 
      WHERE athlete_name = ? AND event_name = ? AND category = ?
      ORDER BY record_numeric ASC LIMIT 1
    `).bind(data.athlete_name, data.event_name, data.category).first()

    let isNewRecord = false
    if (!existing || data.record_numeric < existing.record_numeric) {
      isNewRecord = true
    }

    const result = await DB.prepare(`
      INSERT INTO personal_records (
        athlete_name, school_team, category, age_group, event_name, 
        event_type, record_value, record_numeric, competition_name, 
        record_date, wind_speed, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.athlete_name, data.school_team, data.category, data.age_group,
      data.event_name, data.event_type, data.record_value, data.record_numeric,
      data.competition_name, data.record_date, data.wind_speed, data.is_verified ? 1 : 0
    ).run()

    return c.json({
      success: true,
      record_id: result.meta.last_row_id,
      is_new_personal_best: isNewRecord,
      message: isNewRecord ? '개인 최고 기록 달성!' : '기록이 등록되었습니다'
    })
  } catch (error) {
    console.error('Personal record registration error:', error)
    return c.json({ success: false, error: 'Failed to register personal record' }, 500)
  }
})

// 5. 선수별 개인 기록 조회
app.get('/records/athlete/:athleteName', async (c) => {
  try {
    const athleteName = c.req.param('athleteName')
    const category = c.req.query('category')
    const { DB } = c.env

    let query = `
      SELECT * FROM personal_records 
      WHERE athlete_name = ?
    `
    const params: any[] = [athleteName]

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    query += ` ORDER BY event_name, record_numeric ASC`

    const records = await DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      athlete_name: athleteName,
      category: category,
      records: records.results
    })
  } catch (error) {
    console.error('Athlete records fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch athlete records' }, 500)
  }
})

// 6. 종목별 랭킹 조회
app.get('/rankings/:eventName', async (c) => {
  try {
    const eventName = c.req.param('eventName')
    const category = c.req.query('category')
    const limit = parseInt(c.req.query('limit') || '10')
    const { DB } = c.env

    let query = `
      SELECT 
        athlete_name, school_team, category, record_value, 
        record_numeric, competition_name, record_date,
        ROW_NUMBER() OVER (ORDER BY record_numeric ASC) as ranking
      FROM personal_records 
      WHERE event_name = ?
    `
    const params: any[] = [eventName]

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    query += ` ORDER BY record_numeric ASC LIMIT ?`
    params.push(limit)

    const rankings = await DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      event_name: eventName,
      category: category,
      rankings: rankings.results
    })
  } catch (error) {
    console.error('Rankings fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch rankings' }, 500)
  }
})

// 7. 메달 집계 조회
app.get('/medals/competition/:competitionId', async (c) => {
  try {
    const competitionId = parseInt(c.req.param('competitionId'))
    const { DB } = c.env

    const medals = await DB.prepare(`
      SELECT * FROM medal_counts 
      WHERE competition_id = ?
      ORDER BY 
        (gold_count * 5 + silver_count * 3 + bronze_count * 1) DESC,
        gold_count DESC, silver_count DESC, bronze_count DESC
    `).bind(competitionId).all()

    return c.json({
      success: true,
      competition_id: competitionId,
      medal_standings: medals.results
    })
  } catch (error) {
    console.error('Medal standings fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch medal standings' }, 500)
  }
})

// 8. 실시간 결과 업데이트 조회
app.get('/updates/live/:scheduleId', async (c) => {
  try {
    const scheduleId = parseInt(c.req.param('scheduleId'))
    const { DB } = c.env

    const updates = await DB.prepare(`
      SELECT * FROM result_updates 
      WHERE schedule_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `).bind(scheduleId).all()

    return c.json({
      success: true,
      schedule_id: scheduleId,
      live_updates: updates.results
    })
  } catch (error) {
    console.error('Live updates fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch live updates' }, 500)
  }
})

// 9. 신기록 달성 현황
app.get('/records/achievements', async (c) => {
  try {
    const category = c.req.query('category')
    const { DB } = c.env

    let query = `
      SELECT 
        cr.athlete_name, cr.school_team, cr.event_name, 
        cr.result_value, cr.record_type, 
        s.start_time, comp.name as competition_name
      FROM competition_results cr
      JOIN schedules s ON cr.schedule_id = s.id
      JOIN competitions comp ON s.competition_id = comp.id
      WHERE cr.is_record = 1
    `
    const params: any[] = []

    if (category) {
      query += ` AND EXISTS (
        SELECT 1 FROM personal_records pr 
        WHERE pr.athlete_name = cr.athlete_name AND pr.category = ?
      )`
      params.push(category)
    }

    query += ` ORDER BY s.start_time DESC LIMIT 20`

    const achievements = await DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      category: category,
      recent_records: achievements.results
    })
  } catch (error) {
    console.error('Record achievements fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch record achievements' }, 500)
  }
})

export default app