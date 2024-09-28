# -*- coding: utf-8 -*-
"""
Created on Tue Sep 17 12:11:51 2024

@author: Nicolas
"""

import numpy as np
from scipy.interpolate import CubicSpline


def f(num_points,y_start_user,y_end_user,interval_time):
    # x_start = 0
    # x_end = number of pictures in the serie
    # y_start = exposure time at the begining
    # y_end = exposure time at the end of the serie
    sign = 1
    if y_end_user < y_start_user:
        sign = -1
    x_start, x_end = 0, 10
    y_start, y_end = 0, 30*(sign)
    
    X = np.linspace(0,x_end-1,num_points)
    x = np.array([
        x_start, 
        (x_end - x_start) * 0.2 + x_start, 
        (x_end - x_start) * 0.8 + x_start, 
        x_end
    ])
    # segmeented linear function in cut in 20%-60%-20%
    
    y = np.array([
        y_start, 
        (y_end - y_start) * 0.12 + y_start, 
        (y_end - y_start) * (0.941) + y_start, 
        y_end
    ])
    # i = 0.9381
    # Tangent during the first and last 20% of the interval
    # Create a linear interpolation function
    
    continuous_func = CubicSpline(x, y)
    
    Y = continuous_func(X)
    Y = (abs(Y)*(y_end_user-y_start_user)/30)+y_start_user
    Y2 = continuous_func(X, nu=1)
    # if sign == 1:
    #     print(f"min de f' {min(Y2)}, f est strictement croissante : {min(Y2)>0}")
    # else:
    #     print(f"max de f' {max(Y2)}, f est strictement décroissante : {max(Y2)<0}")
    Y2 = interval_time-Y
    return X, Y,Y2

# def remap(y, y_start, y_end):
#     y = (abs(y)*(y_end-y_start)/30)+y_start
#     return y

# # Example usage:
# x_start, x_end = 0, 10
# y_start, y_end = 1, 40

# # Define a range of X values where we want to evaluate the function
# X = np.linspace(x_start, x_end, 100)  # 100 points between x_start and x_end

# # Get the continuous Y values corresponding to the X values

# X,Y,Y2 = f(x_end,y_start,y_end)    
# # Y = remap(Y,y_start,y_end)

# print(f"erreur à la borne {max(y_end,y_start)} : {abs(max(Y)-max(y_end,y_start))*100:.2f}/100s")
# print(f"erreur à la borne {min(y_end,y_start)} : {abs(min(Y)-min(y_end,y_start))*100:.2f}/100s")



# plt.figure()
# plt.subplot(211)
# plt.plot(X,Y)
# # plt.plot(X,-Y,label="-Y")
# # plt.legend()
# plt.subplot(212)
# plt.plot(X,Y2)
