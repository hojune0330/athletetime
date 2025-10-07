import math

# World Athletics official specifications
STRAIGHT_LENGTH = 84.39  # meters
LANE_WIDTH = 1.22  # meters
KERB_RADIUS = 36.50  # meters
MEASUREMENT_OFFSET_LANE1 = 0.30  # meters (with raised curb)
MEASUREMENT_OFFSET_OTHER = 0.20  # meters

def calculate_lane_distance(lane_number):
    """Calculate the exact distance for a given lane"""
    
    # Calculate measurement radius for each lane
    if lane_number == 1:
        measurement_radius = KERB_RADIUS + MEASUREMENT_OFFSET_LANE1  # 36.80m
    else:
        # For lanes 2-8: measure 20cm from the inside line of the lane
        measurement_radius = KERB_RADIUS + (LANE_WIDTH * (lane_number - 1)) + MEASUREMENT_OFFSET_OTHER
    
    # Calculate total distance
    straight_distance = STRAIGHT_LENGTH * 2  # Two straight sections
    curve_distance = math.pi * measurement_radius * 2  # Two semicircles = one full circle
    total_distance = straight_distance + curve_distance
    
    return {
        'lane': lane_number,
        'measurement_radius': measurement_radius,
        'straight_total': straight_distance,
        'curve_total': curve_distance,
        'total_distance': total_distance,
        'stagger': total_distance - 400 if lane_number > 1 else 0
    }

print("World Athletics 400m Track - Official Lane Distances")
print("=" * 70)
print(f"Straight sections: {STRAIGHT_LENGTH}m × 2 = {STRAIGHT_LENGTH * 2:.2f}m")
print(f"Lane width: {LANE_WIDTH}m")
print(f"Kerb radius: {KERB_RADIUS}m")
print(f"Lane 1 measurement offset: {MEASUREMENT_OFFSET_LANE1}m (from kerb)")
print(f"Lanes 2-8 measurement offset: {MEASUREMENT_OFFSET_OTHER}m (from lane line)")
print("=" * 70)
print()

print(f"{'Lane':<6} {'Radius':<10} {'Straight':<12} {'Curve':<12} {'Total':<12} {'Stagger':<10}")
print("-" * 70)

for lane in range(1, 9):
    data = calculate_lane_distance(lane)
    print(f"{data['lane']:<6} "
          f"{data['measurement_radius']:<10.2f} "
          f"{data['straight_total']:<12.2f} "
          f"{data['curve_total']:<12.2f} "
          f"{data['total_distance']:<12.2f} "
          f"{data['stagger']:<10.2f}")

print()
print("Verification:")
print(f"Lane 1 distance: {calculate_lane_distance(1)['total_distance']:.4f}m (should be ~400m)")
print(f"Lane 8 stagger: {calculate_lane_distance(8)['stagger']:.2f}m")
