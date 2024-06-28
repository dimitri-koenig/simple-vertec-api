all: install test

test: ; @echo 'Running tests...'
	@./node_modules/mocha/bin/mocha.js --exit

install: ; @echo 'Installing packages...'
	@npm ci

publish: ; @echo 'Publishing...'
	@make
	@git push --tags
	@npm publish

publish-beta: ; @echo 'Publishing beta...'
	@make
	@git push --tags
	@npm publish --tag beta

watch: ; @echo 'Running test watch task...'
	nodemon -w test -w lib -e js -x npm test

.PHONY: all install test
