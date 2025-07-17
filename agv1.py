import pandas as pd
import heapq
import math
import sys
import time
from collections import defaultdict
from math import ceil
from datetime import datetime, timedelta

# Constants
CHARGE_STATION = 9
MAX_BATTERY = 45  # minutes
MIN_BATTERY_TO_WORK = 5  # minutes
CHARGE_RATE = 3  # minutes gained per minute of charging
BASE_TRAVEL_TIME = 5  # minutes per edge with 0 load
SAFETY_MARGIN = 1.95

# Initialize logs
structured_logs = []
execution_logs = []
priority_delivery_times = defaultdict(list)

# Load dataset
data = pd.read_excel("/home/sameer/Downloads/Dynamic-AGV-Scheduling-main/AGV_Hackathon_dataset.xlsx")
data['Time of Scheduling'] = pd.to_datetime(data['Time of Scheduling'], format='%H:%M:%S', errors='coerce')
simulation_start = data['Time of Scheduling'].min()

# Network graph (edge weights represent base time in minutes with 0 load)
graph = {
    1: [(2, 5), (4, 5)],
    2: [(1, 5), (3, 5), (5, 5)],
    3: [(2, 5), (6, 5)],
    4: [(1, 5), (7, 5)],
    5: [(2, 5), (6, 5), (8, 5)],
    6: [(3, 5), (5, 5)],
    7: [(4, 5), (8, 5)],
    8: [(5, 5), (7, 5), (9, 5)],
    9: [(8, 5)]
}

class AGV:
    def __init__(self, agv_id, initial_location):
        self.id = agv_id
        self.location = initial_location
        self.battery = MAX_BATTERY
        self.status = 'free'
        self.available_time = simulation_start
        self.charge_count = 0
        self.current_load = 0  # 0 for no load

    def needs_charging(self):
        return self.battery < MIN_BATTERY_TO_WORK

def format_time(dt):
    return dt.strftime("%H:%M")

def log_movement(agv, start_node, end_node, start_time, payload_id, weight, travel_time):
    log_entry = f"agv_{agv.id}-{start_node}-{end_node}-{format_time(start_time)}-{weight}-payload_{payload_id}"
    execution_logs.append(log_entry)
    print(log_entry)  # Output to console for backend to capture
    sys.stdout.flush()  # Ensure immediate output
    
    structured_logs.append({
        'Time': format_time(start_time),
        'Event': 'Start Edge',
        'AGV ID': f'AGV_{agv.id}',
        'Edge': f'{start_node}→{end_node}',
        'Battery Remaining': agv.battery,
        'Status': 'Travelling'
    })
    
    completion_time = start_time + timedelta(minutes=travel_time)
    structured_logs.append({
        'Time': format_time(completion_time),
        'Event': 'Completed Edge',
        'AGV ID': f'AGV_{agv.id}',
        'Edge': f'{start_node}→{end_node}',
        'Battery Remaining': agv.battery - travel_time,
        'Status': 'Busy'
    })

def dijkstra(graph, start, goal):
    distances = {node: math.inf for node in graph}
    previous = {node: None for node in graph}
    distances[start] = 0
    pq = [(0, start)]
    
    while pq:
        dist, current = heapq.heappop(pq)
        if current == goal:
            break
        if dist > distances[current]:
            continue
        for neighbor, weight in graph[current]:
            if dist + weight < distances[neighbor]:
                distances[neighbor] = dist + weight
                previous[neighbor] = current
                heapq.heappush(pq, (dist + weight, neighbor))
    
    if distances[goal] == math.inf:
        return None, math.inf
    
    path = []
    node = goal
    while node is not None:
        path.insert(0, node)
        node = previous[node]
    
    return path, distances[goal]

edge_reservations = defaultdict(list)
node_reservations = defaultdict(list)

def reserve(resource_type, resource, start, end):
    if resource_type == 'edge':
        edge_reservations[resource].append((start, end))
    elif resource_type == 'node':
        node_reservations[resource].append((start, end))

def is_available(resource_type, resource, start_time, duration):
    reservations = edge_reservations if resource_type == 'edge' else node_reservations
    end_time = start_time + timedelta(minutes=duration)
    for booked_start, booked_end in reservations.get(resource, []):
        if not (end_time <= booked_start or start_time >= booked_end):
            return False
    return True

def find_next_available_time(resource_type, resource, desired_start, duration):
    current_time = desired_start
    while True:
        if is_available(resource_type, resource, current_time, duration):
            return current_time
        current_time += timedelta(minutes=1)

def charge_agv(agv):
    required_charge = MAX_BATTERY - agv.battery
    if required_charge <= 0:
        return
    
    charge_time = ceil(required_charge / CHARGE_RATE)
    
    start_time = find_next_available_time('node', CHARGE_STATION, agv.available_time, charge_time)
    reserve('node', CHARGE_STATION, start_time, start_time + timedelta(minutes=charge_time))
    
    structured_logs.append({
        'Time': format_time(start_time),
        'Event': 'Charge Start',
        'AGV ID': f'AGV_{agv.id}',
        'Edge': '-',
        'Battery Remaining': agv.battery,
        'Status': 'Charging'
    })
    
    agv.charge_count += 1
    agv.battery = MAX_BATTERY
    agv.available_time = start_time + timedelta(minutes=charge_time)
    agv.location = CHARGE_STATION
    
    structured_logs.append({
        'Time': format_time(agv.available_time),
        'Event': 'Charge Complete',
        'AGV ID': f'AGV_{agv.id}',
        'Edge': '-',
        'Battery Remaining': agv.battery,
        'Status': 'Free'
    })

def execute_movement(agv, path, task, loaded):
    for i in range(len(path) - 1):
        start_node = path[i]
        end_node = path[i + 1]
        
        load_factor = task['Payload Weight'] if loaded else 0
        travel_time = BASE_TRAVEL_TIME * (1 + load_factor / 10)
        
        start_time = find_next_available_time('edge', (start_node, end_node), agv.available_time, travel_time)
        reserve('edge', (start_node, end_node), start_time, start_time + timedelta(minutes=travel_time))
        reserve('node', end_node, start_time + timedelta(minutes=travel_time), start_time + timedelta(minutes=travel_time + 1))
        
        log_movement(agv, start_node, end_node, start_time, task['ID'], task['Payload Weight'], travel_time)
        
        agv.battery -= travel_time
        agv.available_time = start_time + timedelta(minutes=travel_time)
        agv.location = end_node

def schedule_tasks():
    sorted_tasks = data.sort_values(['Priority', 'Time of Scheduling'])
    
    for _, task in sorted_tasks.iterrows():
        task_assigned = False
        
        for agv in agvs:
            try:
                path_to_source, dist_to_source = dijkstra(graph, agv.location, task['Source'])
                path_to_dest, dist_to_dest = dijkstra(graph, task['Source'], task['Destination'])
                
                if path_to_source is None or path_to_dest is None:
                    continue
                
                battery_needed = (
                    dist_to_source * (1 + 0/10) +
                    dist_to_dest * (1 + task['Payload Weight']/10)
                ) * SAFETY_MARGIN
                
                if battery_needed > MAX_BATTERY:
                    print(f"Task {task['ID']} requires {battery_needed}min battery (max {MAX_BATTERY}min). Skipping.")
                    continue
                
                while agv.battery < battery_needed:
                    prev_battery = agv.battery
                    charge_agv(agv)
                    if agv.battery <= prev_battery:
                        raise ValueError(f"AGV{agv.id} stuck in charging loop")
                
                start_time = max(agv.available_time, task['Time of Scheduling'])
                agv.available_time = start_time
                
                execute_movement(agv, path_to_source, task, loaded=False)
                agv.current_load = task['Payload Weight']
                execute_movement(agv, path_to_dest, task, loaded=True)
                
                delivery_time = (agv.available_time - task['Time of Scheduling']).total_seconds() / 60
                priority_delivery_times[task['Priority']].append(delivery_time)
                
                agv.current_load = 0
                
                if agv.needs_charging():
                    charge_agv(agv)
                
                task_assigned = True
                break
                
            except Exception as e:
                print(f"Task {task['ID']} failed: {e}")
        
        if not task_assigned:
            print(f"Task {task['ID']} (Priority {task['Priority']}) impossible")

# Initialize AGVs
agvs = [AGV(1, 1), AGV(2, 3), AGV(3, 7)]

# Execute scheduling
schedule_tasks()

# Calculate metrics
simulation_end = max(agv.available_time for agv in agvs)
total_execution_time = (simulation_end - simulation_start).total_seconds() / 60  # in minutes

average_delivery = {}
for priority, times in priority_delivery_times.items():
    average_delivery[priority] = sum(times)/len(times) if times else 0

# Write logs and summary
with open("execution_logs.txt", "w") as f:
    for log in execution_logs:
        f.write(log + "\n")

with open("formatted_logs.txt", "w") as f:
    f.write(f"{'Time':<8} {'Event':<15} {'AGV ID':<8} {'Edge':<8} {'Battery':<8} {'Status':<12}\n")
    f.write("-"*60 + "\n")
    for entry in sorted(structured_logs, key=lambda x: datetime.strptime(x['Time'], "%H:%M")):
        f.write(f"{entry['Time']:<8} {entry['Event']:<15} {entry['AGV ID']:<8} {entry['Edge']:<8} {entry['Battery Remaining']:<8} {entry['Status']:<12}\n")

with open("summary.txt", "w") as f:
    f.write(f"Total Execution Time: {total_execution_time:.2f} minutes\n\n")
    f.write("Average Delivery Time by Priority:\n")
    for prio in sorted(average_delivery):
        f.write(f"Priority {prio}: {average_delivery[prio]:.2f} minutes\n")
    f.write("\nAGV Charge Counts:\n")
    for agv in agvs:
        f.write(f"AGV {agv.id}: {agv.charge_count} charges\n")
    f.write("\nFinal AGV Positions and Battery:\n")
    for agv in agvs:
        f.write(f"AGV {agv.id}: Node {agv.location}, Battery: {agv.battery} minutes ({agv.battery / MAX_BATTERY * 100:.1f}%)\n")

print("Scheduling completed. Check execution_logs.txt, formatted_logs.txt, and summary.txt")
