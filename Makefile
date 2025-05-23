CXX = g++
CXXFLAGS = -std=c++17 -pthread
LDFLAGS = -lrt

TARGETS = Constant_Trigger Variable_Trigger server-test

all: $(TARGETS)

Constant_Trigger: Constant_Trigger.cpp
	$(CXX) $(CXXFLAGS) $< -o $@

Variable_Trigger: Variable_Trigger.cpp
	$(CXX) $(CXXFLAGS) $< -o $@

server-test: server-test.cpp
	$(CXX) $(CXXFLAGS) $< -o $@ $(LDFLAGS)

clean:
	rm -f $(TARGETS)
