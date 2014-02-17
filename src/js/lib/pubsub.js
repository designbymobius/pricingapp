// PROJECT BLACKBOX
(function(dxm){
	
	// PUBSUB INTERNALS
	// Publishers announce when an event of note has occured
	// Subscribers react when they get the announcement of the change
	
	// Pubsub System Closure
	dxm = {};
	dxm.notification = dxm.notification || {};
	
	// System Settings
	dxm.settings = {};
	dxm.settings.consoleLog = false;

	// List of Subscribers
	dxm.notification.subscribers = [];
	dxm.notification.log = [];
	
	/* SUBSCRIBE */
	dxm.notification.subscribe = function (notification, subscriber, response, responseParams) {
		
		// if the list of subscribers for this notification doesn't exist, create it
		if (!dxm.notification.subscribers[notification]) {
			dxm.notification.subscribers[notification] = {};
		}
		
		// get list of subscribers to this notification
		var subscriberList = dxm.notification.subscribers[notification];
		
		// add subscriber to the list with function of what they do in response, with params if needed
		subscriberList[subscriber] = {}
		subscriberList[subscriber].response = response;
		subscriberList[subscriber].responseParams = responseParams || null;
		
		// update log
		dxm.notification.log.push({"type": "subscribe", "notification": notification, "subscriber": subscriber});
		
		
	}
	
	/* UNSUBSCRIBE */
	dxm.notification.unsubscribe = function (notification, subscriber) {
		
		// if the subscription list DNE or subscriber isn't on the list, exit
		if (!dxm.notification.subscribers[notification] || !dxm.notification.subscribers[notification][subscriber]) {
			return;
		}
		
		// unsubscribe
		delete dxm.notification.subscribers[notification][subscriber];
		
		// update log
		dxm.notification.log.push({"type": "unsubscribe", "notification": notification, "unsubscriber": subscriber});		
		
	}
	
	/* PUBLISH */
	dxm.notification.publish = function (notification, notificationParams, publisher) {
		
		// if there are no subscribers, exit
		if (!dxm.notification.subscribers[notification]) {
			return;
		}

		publisher = publisher || "unidentified";
		
		// required vars
		var subscriberList = dxm.notification.subscribers[notification],
			informedSubscribers = [];

		
		for (var subscriber in subscriberList) {
			
			
			var params = {};
			params.notificationParams = notificationParams || null;
			params.responseParams = dxm.notification.subscribers[notification][subscriber].responseParams || null;
			
			// inform subscriber in a separate thread 
			setTimeout( (function(subscriber, params) { 
				return function() {
					subscriberList[subscriber].response(params);
				} 
			})(subscriber, params), 0 );
			
			// keep track of who has been informed
			informedSubscribers.push(subscriber); 
			
		}
		
		// update log 
		dxm.notification.log.push({"type": "publish", "notification": notification, "informedSubscribers": informedSubscribers, "publisher": publisher});

		if(dxm.settings.consoleLog !== false){

			console.log('\n Published: ' + notification + '\n Publisher: ' + publisher +  '\n Informed: ' + JSON.stringify(informedSubscribers) );
			console.log("----------------------\n");
		}		
	}

	window.dxmPubSub = dxm.notification;
	window.dxmPubSub.consoleLogOn = function(){ dxm.settings.consoleLog = true; };
	window.dxmPubSub.consoleLogOff = function(){ dxm.settings.consoleLog = false; };
	
})();