@pytalk_on('request')
def test(data):
	pytalk_emit('done', data)

@pytalk_on('test_noargs')
def test_noargs():
	pytalk_emit('done')

@pytalk_on('three_args')
def test_three(a, b, c):
	pytalk_emit('done', a + b + c)