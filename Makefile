BABEL = ./node_modules/.bin/babel
SRC = $(wildcard lib/*.js)

all: clean install test collect-coverage build

build: ; @echo 'Making build...'
	@mkdir -p node/
	@for path in $(SRC); do \
		file=`basename $$path`; \
		$(BABEL) "lib/$$file" > "node/$$file"; \
	done

test: ; @echo 'Running tests...'
	@NODE_ENV=test ./node_modules/mocha/bin/mocha test
	@NODE_ENV=test ./node_modules/eslint/bin/eslint.js lib test

install: ; @echo 'Installing packages...'
	@npm install

clean: ; @echo 'Cleaning up...'
	@rm -fr node

publish: ; @echo 'Publishing...'
	@git push --tags
	@npm publish

publish-beta: ; @echo 'Publishing beta...'
	@git push --tags
	@npm publish --tag beta

watch: ; @echo 'Running test watch task...'
	nodemon -w test -w lib -e js -x npm test

collect-coverage: ; @echo 'Collecting coverage data...'
	@./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha -- test

publish-coverage: ; @echo 'Publishing coverage data'
	@npm install codeclimate-test-reporter
	@$(MAKE) collect-coverage
	@codeclimate-test-reporter < coverage/lcov.info

.PHONY: all clean install test build
