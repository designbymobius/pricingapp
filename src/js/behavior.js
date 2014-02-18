(function(){

    // container
    var app = {},

        intervals = {},

        network = Offline,

        pubsub = dxmPubSub,
        _publish = pubsub.publish,
        _subscribe = pubsub.subscribe,
        _unsubscribe = pubsub.unsubscribe,
        
        allScreens = document.getElementsByClassName('fullscreen'),
        screen_setup = {},

        activeScreenIndex = 0,
        activeScreens = [];

    // bindings
        screen_setup.landing = setup_landing;
        screen_setup.tasks = setup_tasks;
        screen_setup.add_product_manufacturer = setup_add_product_manufacturer;

    // internal functions

        /* INIT */
            
            // get the app started
                function init(){

                    // req vars
                    var current_network_state = networkState();

                    // Load Starting Pages
                        resetActiveScreens();
                        
                    // Set Screen Heights
                        setFullscreenHeight();

                    // Prepare for Window Size Changes
                        setResizeResponses();
                        setResizeListener();

                    // Prepare for Network Changes
                        setNetworkChangeResponses();
                        setNetworkListeners();

                    // Set Appcache Listeners
                        setAppcacheListeners();

                    // Set Current Network State
                        if( current_network_state === "up"){          

                            _publish("network-up", null, this);
                        } 
                        else {          

                            _publish("network-down", null, this);           
                        }

                    // Prepare Screen Setup Listeners
                        screenSetupHandlers();

                        gotoScreen( activeScreenIndex );
                }

        /* SCREEN SETUPS */

            // landing
                function setup_landing(screen){

                    // req vars
                        var startBtn = screen.getElementsByClassName('btn')[0];
                    
                    /* SETUP */

                        // listen for teardown event
                            _subscribe('teardown-screen', 'landing', teardown);
                        
                        // bind enter key 
                            window.addEventListener('keydown', enterHandler);

                        // bind button
                            startBtn.addEventListener('click', gotoNextScreen);


                    function teardown(){

                        // unbind enter key
                            window.removeEventListener('keydown', enterHandler);

                        //unbind button
                            startBtn.removeEventListener('click', gotoNextScreen);
                        
                        // stop listening to teardown
                            _unsubscribe('teardown-screen', 'landing');
                    }

                    function enterHandler(e){

                        if(e.keyCode === 13){
                            
                            gotoNextScreen();
                        }
                    }
                }

            // tasks
                function setup_tasks(screen){

                    /* SETUP */

                        // req vars
                        var addProductsBtn = document.getElementById('start-add-product'),
                            contextSettingsMenu = document.getElementById('context-settings'),
                            cancelTaskBtn = "<div id='cancel-task' class='setting'>cancel task</div>";
                    
                        // prep for teardown
                            _subscribe('teardown-screen', 'tasks', teardown);

                    /* ENABLE TASK LINKS */

                        // add product
                            addProductsBtn.addEventListener("click", addProductsWorkflow);


                    function addProductsWorkflow(){

                        // activate add product screens 
                            addToActiveScreens('add-product');
                        
                        // progress UI
                            gotoNextScreen();

                        // create Cancel Task button                            
                            contextSettingsMenu.innerHTML += cancelTaskBtn;

                        // Cancel Task Button Behavior
                            document.getElementById('cancel-task').addEventListener("click", function(){

                                // remove btn
                                    this.parentNode.removeChild(this);
                                
                                // deactivate add product screens 
                                    removeActiveScreens('add-product');
                                
                                // go to the last active screen
                                    gotoScreen( activeScreens.length - 1 );

                            });
                    }

                    function teardown(){

                        // stop listening for teardown
                            _unsubscribe('teardown-screen', 'tasks');

                        // disable task links
                            addProductsBtn.removeEventListener("click", addProductsWorkflow);
                    }
                }

            // add product
                function setup_add_product_manufacturer(){

                    /* SETUP */
                    
                        // prep for teardown
                            _subscribe('teardown-screen', 'add-products-1', teardown);


                    function teardown(){

                        // stop listening for teardown
                            _unsubscribe('teardown-screen', 'add-products-1');
                    }


                }

        /* SCREENS */

            // screen setup handler
                function screenSetupHandlers(){

                    _subscribe("setup-screen", "do_screen_setup", do_screen_setup );                    
                }

            // set up window resize listener
                function setResizeListener(){

                    onResize(function(){

                        _publish('window-resized', null, this);
                    });
                }

            // set resize responses
                function setResizeResponses(){
                    
                    // when window is resized, resize screens
                        _subscribe( 'window-resized', 'resize-watchdog', setFullscreenHeight );

                    // when screens are resized, scroll to the active one
                        _subscribe( 'screens-resized', 'autoscroller', scrollToActiveScreen );
                }

            // set active screens heights
                function setFullscreenHeight(){

                    for (var i = activeScreens.length - 1; i >= 0; i--) {

                        if (i < activeScreenIndex) { break; }
                        
                        activeScreens[i].style.height = window.innerHeight + "px"; 
                    }

                    _publish('screens-resized', null, this);
                }

            // quickly scroll to active screen
                function scrollToActiveScreen(){

                    scrollTo( activeScreens[activeScreenIndex].offsetTop, 150 ); 
                }

            // do screen setup
                function do_screen_setup(){

                    // req vars
                    var thisScreen = activeScreens[ activeScreenIndex ],
                        thisScreenSetupID = thisScreen.id.replace(/\-/g,"_");

                    // scroll to screen when setup is complete
                        _subscribe(
                            'setup-complete', 
                            'scroll_screen_into_view', 
                            function(){ 
                                
                                scrollTo( thisScreen.offsetTop );

                                _unsubscribe('setup-complete', 'scroll_screen_into_view'); 
                            }
                        );

                    // focal screen tracker
                        addClass( thisScreen, "focal" );
                        
                        _subscribe(

                            'teardown-screen',
                            'defocalizer',
                            function(){

                                removeClass(thisScreen, 'focal');

                                _unsubscribe('teardown-screen', 'defocalizer');
                            }
                        );

                    // set up this screen
                        screen_setup[ thisScreenSetupID ](thisScreen);

                    // setup complete!
                        _publish('setup-complete', null, 'do_screen_setup');
                }

            // deactivate screen and go to a new one
                function gotoScreen(index){

                    _publish("teardown-screen", null, this);

                    activeScreenIndex = index;

                    _publish("setup-screen", null, this );
                }

                    function gotoNextScreen(){

                        gotoScreen(activeScreenIndex + 1);
                    }

            // add active screens
                function addToActiveScreens( screenClass ){

                    var new_screens_tally = 0;

                    for (var i = 0; i < allScreens.length; i++) {
                        
                        if ( hasClass(allScreens[i], screenClass) ) { 

                            // add active class
                                addClass(allScreens[i], 'active');

                            // add to active screens list
                                activeScreens.push( allScreens[i] );

                            // count new screens added
                                new_screens_tally = new_screens_tally + 1;
                        } 
                    }

                    if (new_screens_tally > 0){

                        setFullscreenHeight();
                    }
                }

            // remove active screens
                function removeActiveScreens( screenClass ){

                    var change_tally = 0;

                    for (var i = allScreens.length - 1; i >= 0; i--){
                        
                        if( hasClass(allScreens[i], screenClass) ){

                            // remove active class
                                removeClass(allScreens[i], 'active');

                            // remove from active screens list
                                activeScreens.splice(i, 1);

                            // update tally
                                change_tally = change_tally + 1;
                        }

                        if (change_tally > 0){

                            setFullscreenHeight();
                        }
                    }
                }

            // reset active screens
                function resetActiveScreens(){

                    for (var i = 0; i < allScreens.length; i++) {
                        
                        // remove active class
                            removeClass(allScreens[i], 'active');                     
                    }

                    activeScreens = [];
                    addToActiveScreens('landing');
                    addToActiveScreens('tasks');
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

        /* APPCACHE */

            // set appcache listeners
                function setAppcacheListeners(){

                    if (window.applicationCache){

                        window.applicationCache.addEventListener('downloading', cacheDownloading);
                        window.applicationCache.addEventListener('updateready', cacheReady);
                    }
                }

            // new appcache ready
                function cacheReady(){     

                    alert('App Has Been Updated and will Restart Now');
                    window.applicationCache.swapCache();
                    location.reload(true);
                }

            // new appcache downloading
                function cacheDownloading(){

                    alert("Downloading App Updates - Sorry for the Wait");
                }

        /* UTILS */

            // scroll to 
               var scrollTo = (function(){

                    var timer, start, factor;

                    return function (target, duration) {
                        
                        var offset = window.pageYOffset,
                            delta  = target - window.pageYOffset; // Y-offset difference
                            duration = duration || 400;              // default 400ms animation
                            start = Date.now();                       // get start time
                            factor = 0;

                        if( timer ) {
                            clearInterval(timer); // stop any running animations
                        }

                        function step() {
                            
                            var y;
                            factor = (Date.now() - start) / duration; // get interpolation factor

                            if( factor >= 1 ) {
                                clearInterval(timer); // stop animation
                                factor = 1;           // clip to max 1.0
                            } 

                            y = factor * delta + offset;

                            window.scrollBy(0, y - window.pageYOffset);
                        }

                        timer = setInterval(step, 10);
                        
                        return timer;
                    };
                }());

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

            window.goto = gotoScreen;
            
            init();
        });
}());