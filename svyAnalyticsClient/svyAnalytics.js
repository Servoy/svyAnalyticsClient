/***
 *
 * @public
 * @typedef  {{
 *	id:String,
 *	ipAddress:String,
 *	userAgentString:String,
 *	userName:String,
 *	tenantName:String,
 *	servoyClientID:String,
 *	servoySolutionName:String,
 *	isDeveloper:Boolean,
 *	serverIPAddress:String,
 *	location:{lat:Number,lon:Number},
 *	serverLocation:{lat:Number,lon:Number},
 *	namespace:String
 *
 }}
 *
 * @properties={typeid:35,uuid:"340FB917-EBD6-4FE8-B0EB-970ED0767A6F",variableType:-4}
 */
var Session;

/***
 *
 * @public
 * @typedef  {{
 *  sessionID:String,
 *	type:String,
 *	action:String,
 *	label:String,
 *	value:String,
 *	namespace:String
 }}
 *
 * @properties={typeid:35,uuid:"F655DEBF-03AF-42A9-8C14-D4561338423C",variableType:-4}
 */
var Event;

/**
 * Geo cookie name
 *
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"361AE119-227A-4DF2-862B-BA84368F70B9"}
 */
var GEO_COOKIE = 'com.servoy.extensions.geo';

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"3FA035C3-D9BC-4240-8F34-B7F628518861"}
 */
var baseURL = 'https://svycloud-dev.unifiedui.servoy-cloud.eu';

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"ECBE5BF8-6F5B-42AE-906B-FD6B093ADF5A"}
 */
var servoyAPIKey;

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"2F42A78B-442E-412E-9DF6-42D779C15E68"}
 */
var sessionID = '';

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"95A5BEE0-32D6-459C-AB8F-C97547C39D4B"}
 */
var API_KEY_PROPERTY_NAME = 'com.servoy.cloud.analytics.apiKey';

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"790A7BEB-0FDC-4153-B58C-A1733E6FA496"}
 */
var SVY_CLOUD_NAMESPACE = 'com.servoy.cloud.namespace';

/**
 * @private
 * @type {String}
 *
 * @properties={typeid:35,uuid:"8ACEF042-F561-4D87-99FD-41B4AE7F1B5F"}
 */
var BASE_URL_PROPERTY_NAME = 'com.servoy.cloud.analytics.baseURL';

/**
 * @private
 * @properties={typeid:24,uuid:"FEFED3A7-66AA-42B9-BDFA-98D15A1CCEFB"}
 */
function initialize() {
	servoyAPIKey = application.getUserProperty(API_KEY_PROPERTY_NAME);

	if (!servoyAPIKey) {
		application.output('Failed to initialize analytics module. No value found for property: ' + API_KEY_PROPERTY_NAME, LOGGINGLEVEL.WARNING);
		return;
	}

	//	var baseURLOverride = application.getUserProperty(BASE_URL_PROPERTY_NAME);
	//	if(baseURLOverride){
	//		application.output('Base URL override to property: ' + baseURL,LOGGINGLEVEL.DEBUG);
	//		baseURL = baseURLOverride;
	//	}
	baseURL += '/servoy-service/rest_ws/v1/svyAnalyticsServer';

	application.output('Servoy cloud analytic client initialized', LOGGINGLEVEL.DEBUG)
}

/**
 * Call this to begin an analytics session
 *
 * @public
 * @param {String} [id]
 * @param {String} [tenantName]
 * @return {Boolean}
 * @properties={typeid:24,uuid:"57DD9CA6-949D-408A-B95F-E7C5608F9E44"}
 */
function openSession(id, tenantName) {
	/**@type {Session}*/
	var session = new Object()
	session.id = id,
	session.ipAddress = application.getIPAddress(),
	session.userAgentString = plugins.ngclientutils.getUserAgent(),
	session.userName = security.getUserName(),
	session.tenantName = tenantName,
	session.servoyClientID = security.getClientID(),
	session.servoySolutionName = application.getSolutionName(),
	session.isDeveloper = application.isInDeveloper()
	session.namespace = application.getUserProperty(SVY_CLOUD_NAMESPACE);
	session.location = geoLocate(session.ipAddress)

	var url = baseURL + '/session/';
	var post = plugins.http.createNewHttpClient().createPostRequest(url);
	post.setBodyContent(JSON.stringify(session));
	/** @type {{id:String}} */
	var response = send(post, false);
	if (!response) {
		application.output('Failed to open anayltics session', LOGGINGLEVEL.ERROR);
		return false;
	}
	sessionID = response.id;
	application.output('Opened anayltics session [id=' + sessionID + ']', LOGGINGLEVEL.DEBUG);
	return true;
}

/**
 * Closes analytics session
 * @public
 * @properties={typeid:24,uuid:"1C664895-1DE4-438B-844E-3FAF7D9B28FD"}
 */
function closeSession() {
	if (!sessionID) {
		throw 'No session created. Use openSession()';
	}
	var url = baseURL + '/session/' + sessionID;
	var request = plugins.http.createNewHttpClient().createDeleteRequest(url);
	send(request);
	sessionID = null;
}

/**
 * @public
 * @param {String} path
 *
 * @properties={typeid:24,uuid:"A61E393A-9CEC-4F02-8B83-1A3B3CA8EC60"}
 */
function sendPageView(path) {
	/**@type {Event}*/
	var pageview = new Object()
	pageview.sessionID = sessionID
	pageview.type = 'navigation'
	pageview.action = 'page-view'
	pageview.label = path
	sendEvent(pageview)
}

/**
 * @private
 * @param {Event} event
 *
 * @properties={typeid:24,uuid:"9081FF17-69D8-42FB-B29F-B315A336AB5F"}
 */
function sendEvent(event) {
	if (!event.sessionID) {
		throw 'No session created. Use openSession()';
	}

	var url = baseURL + '/event';
	var post = plugins.http.createNewHttpClient().createPostRequest(url);
	event.namespace = application.getUserProperty(SVY_CLOUD_NAMESPACE);
	post.setBodyContent(JSON.stringify(event));
	send(post, true);
}

/**
 * @private
 * @param {plugins.http.PostRequest|plugins.http.DeleteRequest} request
 * @param {Boolean} [async]
 * @return {*}
 * @properties={typeid:24,uuid:"48B82518-8FA3-4D39-A0C2-58E847A96A91"}
 */
function send(request, async) {
	if (!servoyAPIKey) {
		throw "No API key specified";
	}

	request.addHeader('content-type', 'application/json');
	request.addHeader('servoy-api-key', servoyAPIKey);
	if (async === false) {
		var response = request.executeRequest();
		var code = response.getStatusCode();
		if (code != plugins.http.HTTP_STATUS.SC_OK) {
			application.output('Error executing request: ' + response.getResponseBody(), LOGGINGLEVEL.ERROR);
			return null;
		}
		var body = response.getResponseBody();
		if (!body) {
			return null;
		}
		var payload = JSON.parse(body);
		return payload;
	}
	request.executeAsyncRequest(onSuccess, onError);
	return null;
}

/**
 * @private
 * @param {plugins.http.Response} response
 *
 * @properties={typeid:24,uuid:"A604B745-405D-4E28-B84C-8A6AAC4F7280"}
 */
function onSuccess(response) {
	application.output(response.getResponseBody(), LOGGINGLEVEL.DEBUG);
}

/**
 * @private
 * @param {*} arg
 *
 * @properties={typeid:24,uuid:"CA9FD084-B32F-4786-94A3-A0694032879A"}
 */
function onError(arg) {
	application.output(arg, LOGGINGLEVEL.ERROR);
}

/**
 * @protected
 * @properties={typeid:35,uuid:"E25EED50-D1F4-41D1-884D-4ED49176304D",variableType:-4}
 */
var init = function() {
	initialize();
}();

/**
 * @public
 * @param {String} ipAddress
 * @return {{lat:Number,lon:Number}}
 * @properties={typeid:24,uuid:"90C62BD4-91A3-45FC-BEE0-F12BB26DFF56"}
 */
function geoLocate(ipAddress) {
	/**@type {{lat:Number,lon:Number}}*/
	var location = readCookie()
	if (!location) {
		location = new Object()
		var apiKey = '4f298dccbbe3f2fe000f89b3469371beeb01961b9b9d29dc1805ec49';
		var url = 'https://api.ipdata.co/' + ipAddress + '?api-key=' + apiKey;
		var response = plugins.http.createNewHttpClient().createGetRequest(url).executeRequest();
		if (response.getStatusCode() != plugins.http.HTTP_STATUS.SC_OK) {
			application.output('Failed to get location: ' + response.getResponseBody(), LOGGINGLEVEL.ERROR);
			return null
		}
		/** @type {{latitude:Number,longitude:Number}} */
		var payload = JSON.parse(response.getResponseBody());
		location.lat = payload.latitude
		location.lon = payload.longitude
		
		setCookie(location)
		
		return  location;
	}
	return location
}

/////Cookies

/**
 * Saves the login settings in the cookie
 * @private
 * @properties={typeid:24,uuid:"53B481B5-A464-4E94-B9E6-BF4ECD6169BA"}
 */
function setCookie(info) {
	application.setUserProperty(GEO_COOKIE, JSON.stringify(info))
}

/**
 * Clears the login settings from the cookie
 * @private
 * @properties={typeid:24,uuid:"B57D8E94-AAE8-4166-B1A5-D8D29B45D175"}
 */
function clearCookie() {
	application.setUserProperty(GEO_COOKIE, null);
}

/**
 * Loads login settings from cookie
 * @private
 * @properties={typeid:24,uuid:"47883A58-07A2-4C41-8B2C-91FB49C1AE94"}
 */
function readCookie() {
	var cookie = application.getUserProperty(GEO_COOKIE)
	if (cookie) {
		var info = JSON.parse(cookie)
		return info
	}
	return null
}
