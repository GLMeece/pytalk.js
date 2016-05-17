def test(data):
	pytalk_send('done', data)

pytalk_on('request', test)