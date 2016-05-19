def test(data):
	pytalk_emit('done', data)

pytalk_on('request', test)