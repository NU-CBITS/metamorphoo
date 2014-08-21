SRC = ./
TESTS = ./tests/*.js
REPORTER = list
MOCHAPATH = /usr/local/bin/mocha
TIMEOUT = 5000

test:
	@NODE_ENV=test $(MOCHAPATH) --timeout $(TIMEOUT) -R $(REPORTER) $(TESTS)

# Example usage: make testMatchingRegex FILE="tests/FunfImporter.js" REGEX="sendSQLToDingo"
testMatchingRegex:
	@NODE_ENV=test $(MOCHAPATH) --timeout $(TIMEOUT) -R $(REPORTER) $(FILE) -g $(REGEX)
