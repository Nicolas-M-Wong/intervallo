#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Fri Jul 19 00:05:51 2024

@author: Er-berry
"""

import os
from smbus import SMBus

OPERATING_SYSTEM = os.uname()
RUN_ON_RPi = (OPERATING_SYSTEM.sysname == 'Linux') and (OPERATING_SYSTEM.machine in ['aarch64', 'armv6l'])

SCRIPT_NAME = __file__.split('/')[-1]


class max17043:
    
    REGISTER_VCELL   = 0X02
    REGISTER_SOC     = 0X04
    REGISTER_MODE    = 0X06
    REGISTER_VERSION = 0X08
    REGISTER_CONFIG  = 0X0C
    REGISTER_COMMAND = 0XFE
    
    def __init__(self, busnum:int=1, address:int=0x36)->None:
        self.busnum = busnum
        self._i2c = SMBus(self.busnum)
        self._address = address
        return None
    
    def __str__(self)->str:
        rs  = "i2c address is {}\n".format(self._address)
        rs += "i2c bus is {}\n".format(self.busnum)
        rs += "version is {}\n".format(self.getVersion())
        rs += "vcell is {} v\n".format(self.getVCell())
        rs += "soc is {} %\n".format(self.getSoc())
        rs += "compensatevalue is {}\n".format(self.getCompensateValue())
        rs += "alert threshold is {} %\n".format(self.getAlertThreshold())
        rs += "in alert is {}".format(self.inAlert())
        return rs
    
    def address(self)->int:
        return self._address
    
    def reset(self)->None:
        self.__writeRegister(self.REGISTER_COMMAND, 0x0054)
        return None
    
    def getVCell(self)->float:
        buf = self.__readRegister(self.REGISTER_VCELL)
        return (buf[0] << 4 | buf[1] >> 4) / 1000.0
    
    def getSoc(self)->float:
        buf = self.__readRegister(self.REGISTER_SOC)
        return (buf[0] + (buf[1] / 256.0))
    
    def getVersion(self)->int:
        buf = self.__readRegister(self.REGISTER_VERSION)
        return (buf[0] << 8) | (buf[1])
    
    def getCompensateValue(self)->int:
        return self.__readConfigRegister()[0]
    
    def getAlertThreshold(self)->int:
        return (32 - (self.__readConfigRegister()[1] & 0x1f))
    
    def setAlertThreshold(self, threshold:float)->None:
        self.threshold = 32 - threshold if threshold < 32 else 32
        buf = self.__readConfigRegister()
        buf[1] = (buf[1] & 0xE0) | self.threshold
        self.__writeConfigRegister(buf)
        return None
    
    def inAlert(self)->int:
        return (self.__readConfigRegister())[1] & 0x20
    
    def clearAlert(self)->None:
        self.__readConfigRegister()
        return None
        
    def quickStart(self)->None:
        self.__writeRegister(self.REGISTER_MODE, 0x4000)
        return None
        
    def __readRegister(self, address:int)->int:
        return self._i2c.read_i2c_block_data(self._address, address, 2)
    
    def __readConfigRegister(self)->int:
        return self.__readRegister(self.REGISTER_CONFIG)
    
    def __writeRegister(self, address:int, buf:int)->None:
        self._i2c.write_word_data(self._address, address, buf)
        return None
        
    def __writeConfigRegister(self, buf:int)->None:
        self.__writeRegister(self.REGISTER_CONFIG, buf)
        return None
        
    def deinit(self)->None:
        self._i2c.close()
        return None
