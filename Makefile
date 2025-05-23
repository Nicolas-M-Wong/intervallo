CXX = g++
CXXFLAGS = -std=c++17
WARNFLAGS = -Wall
LDFLAGS = -lrt
PIGPIO = -lpigpio

TARGETS = Constant_Trigger.exe Variable_Trigger.exe server-test.exe

all: $(TARGETS)

Constant_Trigger.exe: Constant_Trigger.cpp
	$(CXX) $(WARNFLAGS) -o $@ $< $(PIGPIO) $(LDFLAGS)

Variable_Trigger.exe: Variable_Trigger.cpp
	$(CXX) $(CXXFLAGS) -o $@ $<

server-test.exe: server-test.cpp
	$(CXX) $(CXXFLAGS) -pthread -o $@ $< $(LDFLAGS)

.PHONY: clean

clean:
	rm -f Constant_Trigger.exe Variable_Trigger.exe server-test
