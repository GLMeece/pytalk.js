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

def pytalk_emit(event_name, data=None):
	json_data = json.dumps({
		'eventName': event_name,
		'data': data
	})

	sys.stdout.write(json_data + '\n')
	sys.stdout.flush()

def pytalk_method(method_name):
	def save_callback(callback):
		def users_method(data):
			to_send = {'error': False}

			try:
				to_send['res'] = callback(data)
			except Exception as e:
				to_send['error'] = str(e)

			pytalk_emit('pytalkMethodDone' + method_name, to_send)

		return pytalk_on('pytalkMethod' + method_name, users_method)

	return save_callback

{_PYTALK_PYTHON_CODE_GOES_HERE_}

while True:
	
	try:
		data = sys.stdin.readline()
		data = json.loads(data)
	except:
		continue	

	if 'exitSignal' in data:
		raise SystemExit

	if data['eventName'] not in pytalk_events:
		continue

	for callback in pytalk_events[data['eventName']]:
		callback(data['data'])