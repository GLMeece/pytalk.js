import math

@pytalk_method('factorial')
def fact(n):
	return math.factorial(n)

@pytalk_method('NaN_test1')
def test1():
	return float('inf')

@pytalk_method('NaN_test2')
def test2():

	class InfPropClass:
		def __init__(self):
			self.prop = float('inf')

	return InfPropClass()