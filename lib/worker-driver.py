pytalk_events = {}

def pytalk_is_valid_json(obj):
	import json

	try:
		json.dumps(obj)
	except:
		return False

	return True

def pytalk_on(event_name, callback=None):
	if event_name not in pytalk_events:
		pytalk_events[event_name] = []

	def save_callback(callback):
		pytalk_events[event_name].append(callback)

	if callback is None:
		return save_callback

	return save_callback(callback)

def pytalk_emit(event_name, data=None):
	import json
	import sys

	json_data = json.dumps({
		'__pytalkObject__': True,
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

def pytalk_object_info(obj):
	import json
	import inspect
	
	res = {}
	res['id'] = id(obj)
	res['methods'] = []
	res['properties'] = []

	members = inspect.getmembers(obj)
	for name, value in members:

		# try to serialize to JSON
		if pytalk_is_valid_json(value):
			res['properties'].append({ 'id': id(value), 'name': name, 'value': value })

		# if is callable, register pytalk_method
		elif hasattr(value, '__call__'):
			method_name = 'pytalkMethod' + str(id(value))
			pytalk_method(method_name)(value)

			res['methods'].append({ 'id': id(value), 'name': name })

		else:
			res['properties'].append({ 'id': id(value), 'name': name })

	return res

def pytalk_init_eventloop():
	import sys
	import json

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

@pytalk_method('pytalkGetObject')
def pytalk_get_object(obj_id):
	import ctypes

	obj = ctypes.cast(obj_id, ctypes.py_object).value
	return pytalk_object_info(obj)

@pytalk_method('pytalkGetModuleId')
def pytalk_get_module_id(module_name):
	import importlib

	module = importlib.import_module(module_name)
	return id(module)

# user's code
{_PYTALK_PYTHON_CODE_GOES_HERE_}

# starting event loop
pytalk_init_eventloop()