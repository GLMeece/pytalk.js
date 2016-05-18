import sys
import json

pytalk_events = {}

def pytalk_on(event_name, callback=None):
	if event_name not in pytalk_events:
		pytalk_events[event_name] = []

	def save_callback(callback):
		pytalk_events[event_name].append(callback)

	if callback is None:
		return save_callback

	return save_callback(callback)

def pytalk_send(event_name, data):
	json_data = json.dumps({
		'eventName': event_name,
		'data': data
	})

	sys.stdout.write(json_data + '\n')
	sys.stdout.flush()

{PYTHON_CODE}

while True:
	
	try:
		data = sys.stdin.readline()
		data = json.loads(data)
	except:
		continue	

	if data['eventName'] not in pytalk_events:
		continue

	for callback in pytalk_events[data['eventName']]:
		callback(data['data'])