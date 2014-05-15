var Ractive = require('ractive')
var Converter = require('pagedown').Converter
var Template = require('./template.js')
var postPartial = require('./postPartial.js')
var config = require('../config.js')

var converter = new Converter()

module.exports = function MainViewModel(butler, linkify) {
	var currentPostName = null
	var data = Object.create(config)

	data.posts = {}

	var templateManager = new Template(butler, linkify, data)
	var ractive = new Ractive({
		el: 'body',
		template: '#main',
		data: data,
		partials: {
			post: postPartial
		}
	})


	function doSomethingAboutThisError(err) {
		console.log(err)
	}

	function getPostList() {
		butler.getPosts(function(err, posts) {
			if (!err) {
				ractive.set('postList', posts.reverse().filter(function(post) {
					return typeof post.metadata.title === 'string'
				}).map(function(post) {
					return {
						title: post.metadata.title,
						filename: post.filename
					}
				}))
			} else {
				doSomethingAboutThisError(err)
			}
		})
	}

	function updatePostInView(post) {
		post.html = templateManager.processPost(post)
		ractive.set('currentPost', post)
		templateManager.createTemplateElements(ractive)

		// Waiting until the current post is displayed before fetching the list of posts
		if (ractive.get('postList') === undefined) {
			getPostList()
		}
	}


	function getPost(key) {
		butler.getPost(key, function(err, post) {
			if (err) {
				if (key !== config.errorPage) {
					window.location = window.location.origin
						+ window.location.pathname
						+ config.pathPrefix
						+ config.pagePathPrefix
						+ config.errorPage
				} else {
					doSomethingAboutThisError(err)
				}
			} else if (key === currentPostName) {
				updatePostInView(post)
			}
		})
	}

	function onPostChanged(key, newValue, oldValue) {
		if (key === currentPostName) {
			updatePostInView(newValue)
		}
	}

	butler.on('post changed', onPostChanged)
	butler.on('index changed', getPostList)

	ractive.on('teardown', function onTeardown() {
		butler.removeListener('post changed', onPostChanged)
		butler.removeListener('index changed', getPostList)
		templateManager.teardownChildren()
	})

	function changeCurrentPost(key) {
		ractive.set('current', key)
		templateManager.teardownChildren()
		currentPostName = key
		getPost(key)
	}

	return {
		setCurrent: changeCurrentPost
	}
}
