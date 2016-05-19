@pytalk_on('request')
def test(data):
	pytalk_emit('done', data)