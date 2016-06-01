pytalk_refs = None
pytalk_events = {}

def pytalk_refs_save(obj):
	global pytalk_regs
	import uuid

	uid = str(uuid.uuid1())
	pytalk_refs[uid] = obj

	return uid

def pytalk_refs_get(uid):
	return pytalk_refs[uid]

def pytalk_refs_default():
	return {
		'__builtins__': __builtins__
	}

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

def pytalk_fix_nan(obj, do_copy=False):
	import math
	import copy

	if do_copy:
		obj = copy.deepcopy(obj)

	if type(obj) is tuple:
		obj = list(obj)

	if type(obj) is list:
		for i, elem in enumerate(obj):
			obj[i] = pytalk_fix_nan(elem)

	elif type(obj) is dict:
		for key, value in obj.iteritems():
			obj[key] = pytalk_fix_nan(value)

	else:
		if obj == float('inf'):
			obj = '__pytalk__PositiveInfinity'
		elif obj == float('-inf'):
			obj = '__pytalk__NegativeInfinity'
		elif isinstance(obj, float) and math.isnan(obj):
			obj = '__pytalk__NaN'	

	return obj

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

	# send in chunks of 1000 chars
	buff_size = 1000

	serialized = json.dumps(pytalk_fix_nan({
		'eventName': event_name,
		'data': data
	}))

	for i in range(0, len(serialized), buff_size):
		chunk = serialized[i : i + buff_size]
		is_final = i + buff_size >= len(serialized)

		message = json.dumps({
			'__pytalkObject__': True,
			'isFinal': is_final,
			'serialized': chunk
		})

		sys.stdout.write(message + '\n')
		sys.stdout.flush()

def pytalk_object_info(obj):
	import inspect
	
	res = {}
	res['id'] = id(obj)
	res['methods'] = []
	res['properties'] = []

	members = inspect.getmembers(obj)

	for name, value in members:

		if pytalk_is_valid_json(value):
			value = pytalk_fix_nan(value, do_copy=True)
			res['properties'].append({ 'name': name, 'value': value })
		else:
			val_uid = pytalk_refs_save(value)

			# if is callable, register pytalk_method
			if callable(value):
				method_name = 'pytalkMethod' + str(val_uid)
				pytalk_method(method_name)(value)

				res['methods'].append({ 'id': val_uid, 'name': name })
			else:
				res['properties'].append({ 'id': val_uid, 'name': name })

	return res

def pytalk_method(method_name):
	def save_callback(callback):
		def users_method(*args):
			to_send = {'error': False, 'isPyObject': False}

			try:
				res = callback(*args)

				if not pytalk_is_valid_json(res):
					res = pytalk_refs_save(res)
					to_send['isPyObject'] = True

				to_send['res'] = res
			except Exception as e:
				to_send['error'] = str(e)

			pytalk_emit('pytalkMethodDone' + method_name, to_send)

		pytalk_on('pytalkMethod' + method_name, users_method)

	return save_callback

def pytalk_call_with_args(cb, args):
	def real_arg(arg):
		if isinstance(a, dict):
			if 'isPyObject' in a:
				return pytalk_refs_get(a['id'])
		return arg

	cb(*[real_arg(a) for a in args])

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
			print "WARNING: no handler for event {}".format(data['eventName'])
			continue

		for callback in pytalk_events[data['eventName']]:
			pytalk_call_with_args(callback, data['args'])

@pytalk_method('pytalkGetObject')
def pytalk_get_object(obj_id):
	import ctypes

	obj = pytalk_refs_get(obj_id)
	return pytalk_object_info(obj)

@pytalk_method('pytalkGetModuleId')
def pytalk_get_module_id(module_name):
	import importlib

	module = importlib.import_module(module_name)
	return pytalk_refs_save(module)

@pytalk_method('pytalkRefsReset')
def pytalk_refs_reset():
	global pytalk_refs
	pytalk_refs = pytalk_refs_default()

# set default refs
pytalk_refs = pytalk_refs_default()

# user's code
{_PYTALK_PYTHON_CODE_GOES_HERE_}

# starting event loop
pytalk_init_eventloop()