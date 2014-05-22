(function(){

    // container
    var app = {},

        intervals = {},

        network = Offline,

        pubsub = dxmPubSub,
        _publish = pubsub.publish,
        _subscribe = pubsub.subscribe,
        _subscribe_once = subscribe_once,
        _unsubscribe = pubsub.unsubscribe,
        
        allScreens = document.getElementsByClassName('fullscreen'),
        screen_setup = {},

        activeScreenIndex = 0,
        activeScreens = [],

        addProductName,
        addProductManufacturer,
        addProductAltname;

    // bindings
        screen_setup.landing = setup_landing;
        screen_setup.tasks = setup_tasks;
        screen_setup.add_product_metadata = setup_add_product_metadata;
        screen_setup.add_product_confirmation = setup_add_product_confirmation;
        screen_setup.view_product_list = setup_view_product_list;

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
                            _subscribe_once('teardown-screen', 'landing', teardown);
                        
                        // bind enter key 
                            window.addEventListener('keydown', enterHandler);

                        // bind button
                            startBtn.addEventListener('click', gotoNextScreen);


                    function teardown(){

                        // unbind enter key
                            window.removeEventListener('keydown', enterHandler);

                        //unbind button
                            startBtn.removeEventListener('click', gotoNextScreen);
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
                            viewProductsBtn = document.getElementById('start-view-products');
                    
                        // prep for teardown
                            _subscribe_once('teardown-screen', 'tasks', teardown);

                    /* ENABLE TASK LINKS */

                        // view products
                            viewProductsBtn.addEventListener("click", viewProductsWorkflow);

                        // add product
                            addProductsBtn.addEventListener("click", addProductsWorkflow);


                    function teardown(){

                        // disable task links
                            addProductsBtn.removeEventListener("click", addProductsWorkflow);
                            viewProductsBtn.removeEventListener("click", viewProductsWorkflow);
                    }
                }

            // add product manufacturer
                function setup_add_product_metadata(screen){

                    /* SETUP */

                        // required vars
                            var currentScreenInputs = screen.getElementsByTagName('input'),
                                productNameInput = screen.getElementsByClassName('product-name')[0],
                                manufacturerNameInput = screen.getElementsByClassName('manufacturer-name')[0],
                                nextBtn = screen.getElementsByClassName('btn')[0];

                        //  activate next btn
                            nextBtn.addEventListener("click", nextBtnHandler);
                    
                        // prep for teardown
                            _subscribe_once('teardown-screen', 'add-product-metadata', teardown);
                            
                        // reset task global vars
                            _subscribe_once('task-ended', 'reset-new-product-values', function(){

                                addProductName = null;
                                addProductManufacturer = null;
                                addProductAltname = null;
                            });


                    function nextBtnHandler(){

                        // required vars
                            var missingInput = 0,
                                totalInputs = currentScreenInputs.length;

                        // mark empty fields
                            for (var i = totalInputs - 1; i >= 0; i--){

                                if( currentScreenInputs[i].value ){ continue; } 
                                
                                missingInput += 1;

                                addClass( currentScreenInputs[i], "attention");

                                currentScreenInputs[i].addEventListener("keydown", confirmValueExists);
                            }

                        // proceed if nothing is missing
                            if(missingInput < 1){

                                addProductName = productNameInput.value;
                                addProductManufacturer = manufacturerNameInput.value;
                                gotoNextScreen();
                            }
                    }

                    function teardown(){

                        // required vars
                            var totalInputs = currentScreenInputs.length;

                            for (var i = totalInputs - 1; i >= 0; i--) {
                                
                                // reset value
                                    currentScreenInputs[i].value = "";

                                // clear fields with attention
                                    if( hasClass(currentScreenInputs[i], "attention") ){

                                        removeClass(currentScreenInputs[i], "attention");
                                    }
                            }

                        // disable next btn
                            nextBtn.removeEventListener("click", nextBtnHandler);
                    }

                    function confirmValueExists(e){

                        if(!e.target.value){ return; }

                        removeClass(e.target, "attention");
                        e.target.removeEventListener("keydown", confirmValueExists);
                    }
                }

            // add product confirmation
                function setup_add_product_confirmation(screen){

                    // required variables
                    var manufacturer_name_slots = screen.getElementsByClassName('manufacturer-name'),
                        product_name_slots = screen.getElementsByClassName('product-name'),
                        create_product_btn = document.getElementById('submit-add-product');

                    // populate manufacturer name slots
                        for (var i = manufacturer_name_slots.length - 1; i >= 0; i--) {
                            
                            manufacturer_name_slots[i].innerHTML = addProductManufacturer;
                        }

                    // populate product name slots
                        for (i = product_name_slots.length - 1; i >= 0; i--) {
                            
                            product_name_slots[i].innerHTML = addProductName;
                        }

                    // Activate Submit Button
                        create_product_btn.addEventListener("click", add_product_to_db);

                        _subscribe_once("teardown-screen", "add-product-confirmation", function(){

                            // disable finalize button
                                create_product_btn.removeEventListener("click", add_product_to_db);

                            // wipe manufacturer name slots
                                for (var i = manufacturer_name_slots.length - 1; i >= 0; i--) {
                                    
                                    manufacturer_name_slots[i].innerHTML = "";
                                }

                            // wipe product name slots
                                for (i = product_name_slots.length - 1; i >= 0; i--) {
                                    
                                    product_name_slots[i].innerHTML = "";
                                } 
                        });

                    function add_product_to_db(){

                        // required vars
                        var product_metadata = {},
                            restart_task;
                            
                            product_metadata.name = encodeURIComponent( addProductName );
                            product_metadata.manufacturer = encodeURIComponent( addProductManufacturer );

                        // send to server
                            HTTP_POST("add-product.php", "product=" + JSON.stringify(product_metadata) );

                        // restart task dialog
                            restart_task = confirm("Done! Add Another Product?");                            
                        
                            if(restart_task === true){

                                _unsubscribe('task-ended', 'task-teardown');                                        
                           
                                _subscribe_once(
                                    "task-ended",
                                    "restart-task",
                                    function(){                                        

                                        removeActiveScreens('add-product');
                                        addProductsWorkflow();
                                    }     
                                );
                            }                        

                        // complete task
                            _publish('task-ended', null, 'add-product-btn');
                    }
                }

            // view product list
                function setup_view_product_list(screen){

                    var product_db_json,
                        list_wrapper = document.getElementById('product-list'),                        
                        appStorage = new Persist.Store('Pricing App Storage',{

                            about: "Data Storage to enhance Offline usage",
                            path: location.href
                        });

                    _subscribe_once("teardown-screen", "teardown", teardown);

                    _subscribe("screens-resized", "resize-list-wrapper", resize_list_wrapper);

                    resize_list_wrapper();

                    appStorage.get("product", function(ok, value){

                        if(value){

                            product_db_json = value;
                            render_product_list(value);
                        }

                        update_product_db_on_device();
                    });
                                     
                    list_wrapper.addEventListener("click", edit_product);


                    function teardown(){

                        list_wrapper.removeEventListener("click", edit_product);

                        _unsubscribe("screens-resized", "resize-list-wrapper");
                        
                        _subscribe_once("setup-complete", "cleanup-product-list", function(){
                            
                            setTimeout(function(){
                                
                                render_product_list('{}');
                            }, 150);
                        });
                    }

                    function resize_list_wrapper(){

                        list_wrapper.style.height = (screen.offsetHeight * 0.7) + "px";
                    }

                    function render_product_list( product_db_json ){

                        var product_db = JSON.parse( product_db_json ),
                            product_db_length = product_db.length,
                            markup = "";

                        if(!product_db_length || product_db_length < 1){

                            markup = "there are no products in the database ...";
                        } 

                        else {

                            for (var i = product_db_length; i >= 1; i--) {
                                
                                markup += "<div class='product' data-product-name='" + product_db[ product_db_length - i ].Name + "' data-product-id='" + product_db[ product_db_length - i ].Id + "'> <div class='name'>" + product_db[ product_db_length - i ].Name + "</div> <div class='price'>" + (product_db[ product_db_length - i ].Price ? "&#8358;" + product_db[ product_db_length - i ].Price : "-----")  + "</div>" + "<div class='settings'>edit</div></div>";
                            }
                        }

                        list_wrapper.innerHTML = markup;
                    }
                        

                    function edit_product(e){

                        var click_target = e.target,
                            click_target_id,
                            set_price_prompt;

                        while( !hasClass(click_target, "settings") ){

                            if( click_target.parentNode == list_wrapper ){ return; }
                            
                            click_target = click_target.parentNode;
                        }

                        click_target = click_target.parentNode;

                        addClass(click_target, "edit-product");

                        click_target_id = click_target.getAttribute('data-product-id');

                        set_price_prompt = prompt("Set Price for '" + click_target.getAttribute('data-product-name').toUpperCase() + "'?");

                        if(set_price_prompt !== null){

                            update_product_price(click_target_id, set_price_prompt);
                            addClass(click_target, "editted-product");
                        }

                        removeClass(click_target, "edit-product");
                    }

                    function update_product_price(product_id, price){

                        // request updates from server
                            HTTP_POST("update-product-price.php", "id=" + product_id + "&price=" + price, function(){

                                // download updates
                                    update_product_db_on_device();
                            });
                    }

                    function update_product_db_on_device(){

                        // get product db via ajax
                            HTTP_POST(
                                "get-product.php", 
                                null,
                                function(response){

                                    if(product_db_json == response) { return; }

                                    alert("Updating Price List");
                                        
                                    product_db_json = response;
                                    appStorage.set("product", response);
                                    render_product_list(response);
                                }
                            );
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
                        _subscribe( 'window-resized', 'screen-height-updater', setFullscreenHeight );

                    // when screens are resized, scroll to the active one
                        _subscribe( 'screens-resized', 'autoscroller', scrollToActiveScreen );
                }

            // set active screens heights
                function setFullscreenHeight(){

                    var padding_top,
                        padding_bottom;

                    for (var i = activeScreens.length - 1; i >= 0; i--) {

                        if (i < activeScreenIndex) { break; }

                        padding_top = document.defaultView.getComputedStyle(activeScreens[i],null).getPropertyValue('padding-top').replace("px", "");
                        padding_bottom = document.defaultView.getComputedStyle(activeScreens[i],null).getPropertyValue('padding-bottom').replace("px", "");
                        
                        activeScreens[i].style.height = (window.innerHeight - padding_top - padding_bottom ) + "px";
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
                        _subscribe_once(
                            'setup-complete', 
                            'scroll-screen-into-view', 
                            function(){ 
                                
                                scrollTo( thisScreen.offsetTop, 400);
                            }
                        );

                    // focal screen tracker
                        addClass( thisScreen, "focal" );
                        
                        _subscribe_once(

                            'teardown-screen',
                            'defocalizer',
                            function(){

                                removeClass(thisScreen, 'focal');
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

                    for (var i = activeScreens.length - 1; i >= 0; i--){
                        
                        if( hasClass(activeScreens[i], screenClass) ){

                            // remove active class
                                removeClass(activeScreens[i], 'active');

                            // remove from active screens list
                                activeScreens.splice(i, 1);

                            // update tally
                                change_tally = change_tally + 1;
                        }

                        if (change_tally > 0){

                            setFullscreenHeight();
                            activeScreenIndex = activeScreens.length - 1;
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
                        _subscribe_once(
                            "network-down",
                            "heartbeat",
                            stopHeartbeat,
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
                        _subscribe_once(

                            'network-reconnecting-exit', 
                            'light-flicker',
                            function(){

                                clearInterval( intervals.checkingLightFlickerInterval );
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

            // subscribe once
                function subscribe_once(notification, subscriber, response, responseParams){

                    _subscribe(
                        notification, 
                        subscriber,

                        function(){

                            response(responseParams);
                            _unsubscribe(notification,subscriber);
                        },

                        responseParams
                    );
                }

            // scroll to 
               var scrollTo = (function(){

                    var timer, start, factor;

                    return function (target, duration, callback) {
                        
                        var offset = window.pageYOffset,
                            delta  = target - window.pageYOffset; // Y-offset difference
                            duration = duration || 400;              // default 400ms animation
                            callback = callback || function(){ _publish("arrived-at-new-screen", null, "scroll-screen-into-view"); };
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

                                callback();
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

            // XMLHTTP POST
                function HTTP_POST(url, msg, success, fail){

                    // filter
                        if (!url){ return false; }

                    // reqs
                    var server_trip = new XMLHttpRequest();
                        
                        msg = msg || "";
                        success = success || function(response){ console.log("POST TO " + url + " SUCCESSFUL! \nRESPONSE: "); console.log(response); };
                        fail = fail || function(response){ console.log("POST TO " + url + " UNSUCCESSFUL. \nXMLHTTP OBJECT:"); console.log(response); };

                    // prep POST
                        server_trip.open('POST', url, true);
                        server_trip.setRequestHeader("Content-type","application/x-www-form-urlencoded");
                        server_trip.onreadystatechange = function(){

                            // filter uncompleted responses
                                if (server_trip.readyState !=4){ return; }

                            // success
                                if ( server_trip.status > 199 && server_trip.status < 400 ){ success(server_trip.responseText); }

                            // fail
                                else{ fail(server_trip); }                      
                        };

                    // POST
                        server_trip.send(msg);

                    return true;    
                }


            function addProductsWorkflow(){

                // activate add product screens 
                    addToActiveScreens('add-product');
                
                // progress UI
                    gotoNextScreen();

                // add cancel task btn to HUD
                    create_cancel_task_btn();

                // clean up task when it ends
                    _subscribe_once('task-ended', 'task-teardown', function(){

                        gotoScreen(1);
                        setTimeout(function(){
                            removeActiveScreens('add-product');
                        }, 250);
                    });
            }

            function viewProductsWorkflow(){

                // activate add product screens 
                    addToActiveScreens('view-product');
                
                // progress UI
                    gotoNextScreen();

                // add cancel task btn to HUD
                    create_cancel_task_btn();

                // clean up task when it ends
                    _subscribe_once('task-ended', 'task-teardown', function(){

                        gotoScreen(1);
                        setTimeout(function(){
                            removeActiveScreens('view-product');
                        }, 250);
                    });
            }

            function create_cancel_task_btn(){

                var contextSettingsMenu = document.getElementById('context-settings'),
                    cancelTaskBtnMarkup = "<div id='cancel-task' class='setting'>cancel task</div>";

                // create Cancel Task button                            
                    contextSettingsMenu.innerHTML += cancelTaskBtnMarkup;

                // remove btn when task ends
                    _subscribe_once("task-ended", "remove-cancel-task-btn", 

                        function(){

                            var cancel_task_btn = document.getElementById('cancel-task');

                            cancel_task_btn.parentNode.removeChild(cancel_task_btn);
                        }
                    );

                // set behavior
                    document.getElementById('cancel-task').addEventListener("click", function(){

                        _publish("task-ended", "cancel-task-btn");
                    });
            }            
            
            pubsub.log.crawl = function(key){

                var results = "";

                for(var i = 0; i < pubsub.log.length - 1; i += 1){ 

                if( 
                    (
                        (typeof key == 'string' || key instanceof String) && (   
                            ((typeof pubsub.log[i].publisher == 'string' || pubsub.log[i].publisher instanceof String) && pubsub.log[i].publisher.toLowerCase() == key.toLowerCase()) ||  ((typeof pubsub.log[i].subscriber == 'string' || pubsub.log[i].subscriber instanceof String) && pubsub.log[i].subscriber.toLowerCase() == key.toLowerCase()) ||  ((typeof pubsub.log[i].unsubscriber == 'string' || pubsub.log[i].unsubscriber instanceof String) && pubsub.log[i].unsubscriber.toLowerCase() == key.toLowerCase()) ||  ((typeof pubsub.log[i].type == 'string' || pubsub.log[i].type instanceof String)  && pubsub.log[i].type.toLowerCase() == key.toLowerCase()) ||  ((typeof pubsub.log[i].notification == 'string' || pubsub.log[i].notification instanceof String) && pubsub.log[i].notification.toLowerCase() == key.toLowerCase()) 
                        )
                    ) || (key === null && pubsub.log[i].publisher) 
                ){ 

                    results += "\n\n-[" + i + "]-\n[" +  ( pubsub.log[i].subscriber || pubsub.log[i].publisher || pubsub.log[i].unsubscriber ) + "] " + pubsub.log[i].type + " " + pubsub.log[i].notification;
                }
                }

                console.log(results);
            };

            pubsub.log.range = function(a,b){

                var results = "",
                    start,
                    end;

                start = a > b ? b : a;
                end = a > b ? a : b;


                if(start < 0 || end > pubsub.log.length - 1){

                    return console.log("wtf bro");
                }

                console.log("crawling " + start + " to " + end);

                for(var i = start; i <= end; i += 1){

                    results += "\n\n-[" + i + "]-\n[" +  ( pubsub.log[i].subscriber || pubsub.log[i].publisher || pubsub.log[i].unsubscriber ) + "] " + pubsub.log[i].type + " " + pubsub.log[i].notification;
                }

                console.log(results);
            };

    // LAUNCH APP WHEN DOM IS READY
        document.addEventListener("DOMContentLoaded", function(){ 

            init();
            goto = gotoScreen;
            ASE = activeScreens;
        });
}());