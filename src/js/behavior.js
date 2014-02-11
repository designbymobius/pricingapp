(function(){

    // container
    var app = {},

        intervals = {},

        network = Offline,

        pubsub = dxmPubSub,
        _publish = pubsub.publish,
        _subscribe = pubsub.subscribe,
        _unsubscribe = pubsub.unsubscribe,

        activeScreenIndex = 0;

    // internal functions

        /* INIT */
            
            // get the app started
                function init(){

                    var current_network_state = networkState();
                        
                    // Set Screen Heights
                        setFullscreenHeight();

                    // Prepare for Window Size Changes
                        setResizeListener();
                        setResizeResponses();

                    // Prepare for Network Changes
                        setNetworkListeners();
                        setNetworkChangeResponses();

                    // Set Current Network State
                        if( current_network_state === "up"){          

                            _publish("network-up", null, this);
                        } 
                        else {          

                            _publish("network-down", null, this);           
                        }
                }

        /* SCREENS */

            // set up window resize listener
                function setResizeListener(){

                    onResize(function(){

                        _publish('window-resized', null, this);
                    });
                }

            // set resize responses
                function setResizeResponses(){
                    
                    _subscribe( 'window-resized', 'resize-watchdog', setFullscreenHeight );
                }

            // set screen heights
                function setFullscreenHeight(){

                    var screens = document.getElementsByClassName('fullscreen');

                    for (var i = screens.length - 1; i >= 0; i--) {

                        if (i < activeScreenIndex) { break; }
                        
                        screens[i].style.height = window.innerHeight + "px"; 
                    }

                    _publish('screens-resized', null, this);
                }

        /* NETWORK */

            // configure network detection
                network.options = {

                    checkOnLoad: true,
                    interceptRequests: false,
                    requests: false,
                    checks: {active: 'xhr', xhr: {url: 'server-check.php'}}
                };

            // heartbeat
                function heartbeat(){ 

                    // req vars
                    var stopHeartbeat = function(){

                        clearInterval( intervals.heartbeat );
                        delete intervals.heartbeat;
                    };

                    // check every 7.5s
                        intervals.heartbeat = setInterval( network.check, 1000 * 7.5);

                    // stop heartbeat on disconnect from the internet
                        _subscribe(
                            "network-down",
                            "heartbeat",
                            function(){

                                stopHeartbeat();
                                _unsubscribe("network-down", "heartbeat");                                
                            },
                            null
                        );
                }

            // flicker network connection lights
                function flickerNetworkLights(){

                    var indicators = document.getElementsByClassName('connection-indicator');
                    
                    // Flicker Lights while Reconnecting  
                        intervals.checkingLightFlickerInterval = setInterval( function(){             

                            for (var i = indicators.length - 1; i >= 0; i--) {
                                
                                // Orange On
                                    addClass(indicators[i], "connection-checking");

                                // Orange Off
                                    setTimeout( function(){

                                        var count = i;

                                        return function(){ removeClass(indicators[count], "connection-checking"); };
                                    }(), 350);
                            }
                        }, 2000);

                    // Stop Flickering on Reconnect Exit
                        _subscribe(

                            'network-reconnecting-exit', 
                            'light-flicker',
                            function(){

                                clearInterval( intervals.checkingLightFlickerInterval );
                                _unsubscribe('network-reconnecting-exit', 'light-flicker');
                            },
                            null
                        );
                }

            // set network online class
                function setOnlineBodyClass(){
                   
                   removeClass(document.body, "connection-offline");
                   addClass(document.body, "connection-online");
                }

            // set network offline class
                function setOfflineBodyClass(){
                    
                    removeClass(document.body, "connection-online");
                    addClass(document.body, "connection-offline");
                }

            // get current network state
                function networkState(){

                    network.check();

                    return network.state;
                }

            // set up network state listeners
                function setNetworkListeners(){

                    // connected to network
                        network.on("up", function(){

                            _publish("network-up", null, "connection-watchdog");
                        });

                    // disconnected from network
                        network.on("down", function(){

                            _publish("network-down", null, "connection-watchdog");
                        });

                    // started to reconnect
                        network.on("reconnect:started", function(){

                            _publish("network-reconnecting", null, "connection-watchdog");
                        });

                    // stopped reconnect
                        network.on("reconnect:stopped", function(){

                            _publish("network-reconnecting-exit", null, "connection-watchdog");
                        });
                }

            // set network state change responses
                function setNetworkChangeResponses(){

                    // Online -> Set Body Class
                        _subscribe( 'network-up', 'online-indicator', setOnlineBodyClass );

                    // Online -> Continuously Check Network State
                        _subscribe( 'network-up', 'heartbeat', heartbeat );

                    // Offline -> Set Body Class
                        _subscribe( 'network-down', 'online-indicator', setOfflineBodyClass );

                    // Reconnect -> Flicker Lights
                        _subscribe( 'network-reconnecting', 'light-flicker', flickerNetworkLights );
                } 

        /* UTILS */

            // window resize detection + debouncer
                function onResize(c,t){
                    
                    onresize = function(){
                        
                        clearTimeout(t);
                        t=setTimeout(c,250);
                    };

                    return c;
                }

            // check if class exists
                function hasClass(element, nameOfClass){

                    return element.className.match(new RegExp('(\\s|^)'+nameOfClass+'(\\s|$)'));
                }

            // add class if it doesn't exist
                function addClass(element, nameOfClass){
                
                    if ( !hasClass(element, nameOfClass) ){
                        
                        element.className += " "+nameOfClass;
                    }
                }

            // remove class if it exists
                function removeClass(element, nameOfClass){
                
                    if ( hasClass(element, nameOfClass) ){
                        
                        var reg = new RegExp('(\\s|^)'+nameOfClass+'(\\s|$)');
                        element.className=element.className.replace(reg,' ');
                    }
                }


    // LAUNCH APP WHEN DOM IS READY
        document.addEventListener("DOMContentLoaded", function(){
            init();
        });
}());