import math

@pytalk_method('factorial')
def fact(n):
	return math.factorial(n / 0)