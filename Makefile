CXX = g++
WARNFLAGS = -Wall
LDFLAGS = -lrt
PIGPIO = -lpigpio

TARGETS = Constant_Trigger.exe

all: $(TARGETS)

Constant_Trigger.exe: Constant_Trigger.cpp
	$(CXX) $(WARNFLAGS) -o $@ $< $(PIGPIO) $(LDFLAGS)

.PHONY: clean

clean:
	rm -f Constant_Trigger.exe
