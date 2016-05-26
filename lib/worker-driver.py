pytalk_refs = {}
pytalk_events = {}

def pytalk_refs_save(obj):
	global pytalk_regs
	import uuid

	uid = str(uuid.uuid1())
	pytalk_refs[uid] = obj

	return uid

def pytalk_refs_get(uid):
	return pytalk_refs[uid]

def pytalk_is_valid_json(obj):
	import json

	types_b = [type(obj) is x for x in [list, dict, tuple, str, int, float]]
	if True not in types_b:
		return False

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

def pytalk_object_info(obj):
	import math
	import inspect
	
	res = {}
	res['id'] = id(obj)
	res['methods'] = []
	res['properties'] = []

	members = inspect.getmembers(obj)

	for name, value in members:

		is_valid = pytalk_is_valid_json(value)
		#is_func = callable(value)
		is_func = hasattr(value, '__call__')

		val_uid = pytalk_refs_save(value)
		
		# try to serialize to JSON
		if is_valid:
			# special case for NaN values
			if value == float('inf'):
				value = '__pytalk__PositiveInfinity'
			elif value == float('-inf'):
				value = '__pytalk__NegativeInfinity'
			elif isinstance(value, float) and math.isnan(value):
				value = '__pytalk__NaN'

			res['properties'].append({ 'id': val_uid, 'name': name, 'value': value })

		# if is callable, register pytalk_method
		elif is_func:
			method_name = 'pytalkMethod' + str(val_uid)
			pytalk_method(method_name)(value)

			res['methods'].append({ 'id': val_uid, 'name': name })

		else:
			res['properties'].append({ 'id': val_uid, 'name': name })

	return res

def pytalk_method(method_name):
	def save_callback(callback):
		def users_method(data):
			to_send = {'error': False, 'isPyObject': False}

			try:

				if data is None:
					res = callback()
				else:
					res = callback(data)

				if not pytalk_is_valid_json(res):
					res = pytalk_refs_save(res)
					to_send['isPyObject'] = True

				to_send['res'] = res
			except Exception as e:
				to_send['error'] = str(e)

			pytalk_emit('pytalkMethodDone' + method_name, to_send)

		pytalk_on('pytalkMethod' + method_name, users_method)

	return save_callback

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

	obj = pytalk_refs_get(obj_id)
	info = pytalk_object_info(obj)

	return info

@pytalk_method('pytalkGetModuleId')
def pytalk_get_module_id(module_name):
	import importlib

	module = importlib.import_module(module_name)
	return pytalk_refs_save(module)

# user's code
{_PYTALK_PYTHON_CODE_GOES_HERE_}

# starting event loop
pytalk_init_eventloop()