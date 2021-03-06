/*
Copyright 2014 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

goog.provide('cam.Navigator');

goog.require('goog.Uri');

// Navigator intercepts various types of browser navgiations and gives its client an opportunity to decide whether the navigation should be handled with JavaScript or not.
// Currently, 'click' events on hyperlinks and 'popstate' events are intercepted. Clients can also call navigate() to manually initiate navigation.
//
// @param Window win The window to listen for click and popstate events within to potentially interpret as navigations.
// @param Location location Network navigation will be executed using this location object.
// @param History history PushState navigation will be executed using this history object.
// @param boolean= opt_beforeOnload Whether this is being constructed before window.onload. We have to ignore the first popstate event in some browsers in this case.
cam.Navigator = function(win, location, history, opt_beforeOnload) {
	this.win_ = win;
	this.location_ = location;
	this.history_ = history;
	this.handlers_ = [];
	this.ignoreNextPopstate_ = Boolean(opt_beforeOnload) && !this.history_.state;
	this.win_.addEventListener('click', this.handleClick_.bind(this));
	this.win_.addEventListener('popstate', this.handlePopState_.bind(this));
};

// Client should set this to handle navigation.
// If this method returns true, then Navigator considers the navigation handled locally, and will add an entry to history using pushState(). If this method returns false, Navigator lets the navigation fall through to the browser.
// @param goog.Uri newURL The URL to navigate to. At this point location.href has already been updated - this is just the parsed representation.
// @return boolean Whether the navigation was handled locally.
cam.Navigator.prototype.onNavigate = function(newURL) {};

// Programmatically initiate a navigation to a URL. Useful for triggering navigations from things other than hyperlinks.
// @param goog.Uri url The URL to navigate to.
cam.Navigator.prototype.navigate = function(url) {
	if (this.dispatchImpl_(url, true)) {
		return;
	}
	this.location_.href = url.toString();
};

// Handles navigations initiated via clicking a hyperlink.
cam.Navigator.prototype.handleClick_ = function(e) {
	if (e.button != 0) {
		return;
	}
	for (var elm = e.target; ; elm = elm.parentElement) {
		if (!elm) {
			return;
		}
		if (elm.nodeName == 'A' && elm.href) {
			break;
		}
	}
	try {
		if (this.dispatchImpl_(new goog.Uri(elm.href), true)) {
			e.preventDefault();
		}
	} catch (ex) {
		// Prevent the navigation so that we can see the error.
		e.preventDefault();
		throw ex;
	}
	// Otherwise, the event continues bubbling and navigation should happen as normal via the browser.
};

// Handles navigation via popstate.
cam.Navigator.prototype.handlePopState_ = function() {
	if (this.ignoreNextPopstate_) {
		this.ignoreNextPopstate_ = false;
		return;
	}
	if (!this.dispatchImpl_(new goog.Uri(this.location_.href), false)) {
		this.location_.reload();
	}
};

cam.Navigator.prototype.dispatchImpl_ = function(url, addState) {
	if (this.onNavigate(url)) {
		if (addState) {
			this.history_.pushState(null, '', url.toString());
		}
		return true;
	}
	return false;
};
