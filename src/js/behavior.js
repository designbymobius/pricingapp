(function(){

    // required vars
        var app = {},

        intervals = {},

        network = Offline,

        pubsub = dxmPubSub,
        _publish = pubsub.publish,
        _subscribe = pubsub.subscribe,
        _subscribe_once = subscribe_once,
        _unsubscribe = pubsub.unsubscribe,
        
        allScreens = document.getElementsByClassName('fullscreen'),
        activeScreenIndex = 0,
        activeScreens = [],
        screen_setup = {},

        addProductName,
        addProductManufacturer,

        deviceStorage;

    // screen setup bindings
        screen_setup.landing = setup_landing;
        screen_setup.view_product_list = setup_view_product_list;
        screen_setup.add_product_metadata = setup_add_product_metadata;
        screen_setup.add_product_confirmation = setup_add_product_confirmation;

    // internal functions

        /* INIT */
            
            // get the app started
                function init(){

                    // Disable Touch Scrolling
                        document.addEventListener('touchmove', function(e){

                            var swipe_target = e.target;

                            while(swipe_target !== document.body){
                                
                                swipe_target = swipe_target.parentNode;
                            }

                            e.preventDefault();
                        });

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

                    // Create Network Transaction Offline Storage Area
                        createDeviceStorage();

                    // Set Current Network State
                        if( networkState() === "up"){          

                            _publish("network-up", null, 'app-init');
                        }

                        else {          

                            _publish("network-down", null, 'app-init');           
                        }

                    // Prepare Screen Setup Listeners
                        screenSetupHandlers();

                    // Activate the Requested Screen
                        gotoScreen( activeScreenIndex );
                }

        /* SCREENS */

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

            // add product metadata
                function setup_add_product_metadata(screen){

                    /* SETUP */

                        // required vars
                            var currentScreenInputs = screen.getElementsByTagName('input'),
                                productNameInput = screen.getElementsByClassName('product-name')[0],
                                manufacturerNameInput = screen.getElementsByClassName('manufacturer-name')[0],
                                manufacturerList = screen.getElementsByClassName('manufacturer-list')[0],
                                nextBtn = screen.getElementsByClassName('btn')[0];

                        //  activate next btn
                            nextBtn.addEventListener("click", nextBtnHandler);

                        // enter button handler
                            window.addEventListener("keydown", enterBtnHandler);
                    
                        // prep for teardown
                            _subscribe_once('teardown-screen', 'add-product-metadata', teardown);
                            
                        // reset task global vars
                            _subscribe_once('task-ended', 'reset-new-product-values', function(){

                                addProductName = null;
                                addProductManufacturer = null;
                            });

                        // push manufacturer list value to manufacturer name input
                            manufacturerList.addEventListener("change", update_manufacturer_name_field);

                        // populate manufacturer list
                            render_manufacturer_list();


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

                            if ( hasClass(manufacturerList, "attention") ){

                                removeClass(manufacturerList, "attention");
                            }

                        // clean up listeners
                            nextBtn.removeEventListener("click", nextBtnHandler);                            
                            window.removeEventListener("keydown", enterBtnHandler);
                            manufacturerNameInput.removeEventListener("change", update_manufacturer_name_field);
                    }

                    function render_manufacturer_list(){

                        // required vars
                            var manufacturer_db_json,
                                manufacturer_db;

                        // load
                            deviceStorage.get("manufacturer", function(ok, value){

                                if(ok && value !== null){

                                    manufacturer_db_json = value;
                                    do_list_rendering(manufacturer_db_json);
                                }

                                _subscribe_once(

                                    "manufacturer-metadata-updated",
                                    "render-manufacturer-list",
                                    render_newest_db
                                );
                                
                                download_current_manufacturer_db();

                                function render_newest_db(data){

                                    if(manufacturer_db_json == data.notificationParams){ return; }
                                    
                                    manufacturer_db_json = data.notificationParams;
                                    do_list_rendering(manufacturer_db_json);
                                }
                            });

                            function do_list_rendering(manufacturer_db_json){

                                var manufacturer_json = manufacturer_db_json,
                                    markup = "<option value='0'>-- Select Manufacturer --</option>";

                                manufacturer_db = JSON.parse(manufacturer_db_json);

                                manufacturer_db.sort(function(a, b){

                                    a = a.Name.toLowerCase();
                                    b = b.Name.toLowerCase();

                                    if(a > b){ return 1; }
                                    else if(b > a){ return -1; }
                                    else { return 0; }
                                });

                                for(var manufacturer in manufacturer_db){

                                    markup += "<option value='" + manufacturer_db[manufacturer].Id + "'>" + manufacturer_db[manufacturer].Name.toUpperCase() + "</option>"; 
                                }

                                markup += "<option value='-1'>-- New Manufacturer --</option>";

                                manufacturerList.innerHTML = markup;
                            }
                    }

                    function update_manufacturer_name_field(){

                        var option = manufacturerList.options[manufacturerList.selectedIndex],
                            option_value = option.value,
                            option_text = option.text;

                        // add new manufacturer
                            if(option_value === "-1"){

                                // view manufacturer name field
                                    manufacturerNameInput.value = "";

                                    if(manufacturerNameInput.type != "text"){
                                        manufacturerNameInput.type = "text";
                                    }

                                    manufacturerNameInput.focus();

                                // reset view state on screen teardown
                                    _subscribe_once('teardown-screen', 'hide-manufacturer-textfield', function(){
                                    
                                        manufacturerNameInput.type = "hidden";
                                    });

                                return;
                            }

                        // hide default input field
                            if(manufacturerNameInput.type != "hidden"){

                                manufacturerNameInput.type = "hidden";
                            }

                        // blank option - do nothing
                            if(option_value === "0"){ return; }

                        // default - set hidden manufacturer field                         
                            manufacturerNameInput.value = option_text;
                    }

                    function nextBtnHandler(){

                        // required vars
                            var missingInput = 0,
                                totalInputs = currentScreenInputs.length;

                        // mark empty fields
                            for (var i = totalInputs - 1; i >= 0; i--){

                                if( currentScreenInputs[i].value ){ continue; }

                                if( currentScreenInputs[i] == manufacturerNameInput && manufacturerNameInput.getAttribute('type') == "hidden"){

                                    addClass( manufacturerList, "attention");
                                    manufacturerList.addEventListener("change", manufacturerSelected);                                    
                                } 
                                
                                missingInput += 1;

                                addClass( currentScreenInputs[i], "attention");

                                currentScreenInputs[i].addEventListener("keyup", confirmValueExists);
                            }

                        // proceed if nothing is missing
                            if(missingInput < 1){

                                addProductName = productNameInput.value;
                                addProductManufacturer = manufacturerNameInput.value;
                                gotoNextScreen();
                            }
                    }

                    function enterBtnHandler(e){

                        if(e.keyCode != 13){ return; }

                        nextBtnHandler();
                    }

                    function confirmValueExists(e){

                        if(!e.target.value){ return; }

                        removeClass(e.target, "attention");
                        e.target.removeEventListener("keydown", confirmValueExists);
                    }

                    function manufacturerSelected(){

                        if(!manufacturerNameInput.value){ return; }

                        removeClass(manufacturerList, "attention");
                        manufacturerList.addEventListener("keyup", manufacturerSelected);
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
                        
                    // Enter Key Behavior
                        window.addEventListener("keydown", enterBtnHandler);

                    // Teardown
                        _subscribe_once("teardown-screen", "add-product-confirmation", function(){

                            // disable finalize button
                                create_product_btn.removeEventListener("click", add_product_to_db);
                                window.removeEventListener("keydown", enterBtnHandler);

                            // wipe manufacturer name slots
                                for (var i = manufacturer_name_slots.length - 1; i >= 0; i--) {
                                    
                                    manufacturer_name_slots[i].innerHTML = "";
                                }

                            // wipe product name slots
                                for (i = product_name_slots.length - 1; i >= 0; i--) {
                                    
                                    product_name_slots[i].innerHTML = "";
                                } 
                        });

                    function enterBtnHandler(e){

                        if(e.keyCode != 13){ return; }

                        create_product_btn.click();
                    }

                    function add_product_to_db(){

                        // required vars
                        var product_metadata = {},
                            restart_task;
                            
                            product_metadata.name = encodeURIComponent( addProductName );
                            product_metadata.manufacturer = encodeURIComponent( addProductManufacturer );

                            product_hash = CryptoJS.SHA1( JSON.stringify(product_metadata) ).toString();

                        // send to server
                            create_transaction('product', 'create-' + product_hash, 'name', addProductName);
                            create_transaction('product', 'create-' + product_hash, 'manufacturer', addProductManufacturer);

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

                    // required vars
                        var product_list_wrapper = document.getElementById('product-list'),                        
                            manufacturer_list_wrapper = document.getElementById('manufacturer-list'),
                            product_list_touchstart_pos;

                    // teardown
                        _subscribe_once("teardown-screen", "teardown", teardown);

                    // update product list view when model updates
                        _subscribe("product-metadata-updated", "update-product-list", function(data){

                            alert("Loading Updates");

                            render_product_list();
                        });

                    // update manufacturer list view when model updates
                        _subscribe("manufacturer-metadata-updated", "update-manufacturer-list", function(data){

                            render_manufacturer_list();
                        });

                    // log failed transaction and reattempt
                        _subscribe("requeue-failed-transaction", "update-product-list", function(data){

                            console.log('requeue data');
                            console.log(data.notificationParams);
                        });

                    // filter rendered product list by manufacturer
                        _subscribe("product-list-rendered", "filter-by-manufacturer", function(){

                                if ("createEvent" in document) {
                                    var evt = document.createEvent("HTMLEvents");
                                    evt.initEvent("change", false, true);
                                    manufacturer_list_wrapper.dispatchEvent(evt);
                                }
                                
                                else {
                                    manufacturer_list_wrapper.fireEvent("onchange");
                                }
                            }
                        );

                    // fit list wrapper to screen size and update on resize
                        resize_list_wrappers();
                        _subscribe("screens-resized", "resize-list-wrappers", resize_list_wrappers);
                    
                    // product list edit button behavior
                        product_list_wrapper.addEventListener("click", edit_product);

                    // activate touch scrolling
                        product_list_wrapper.addEventListener("touchstart", set_scroll_touch_position);
                        product_list_wrapper.addEventListener("touchmove", product_list_wrapper_scroll);

                    // activate filtering by manufacturer
                        manufacturer_list_wrapper.addEventListener("change", manufacturer_filter);

                    // render modules
                        render_product_list();
                        render_manufacturer_list();
                        create_add_product_btn();

                    function teardown(){

                        product_list_wrapper.removeEventListener("click", edit_product);
                        product_list_wrapper.removeEventListener("touchmove", product_list_wrapper_scroll);

                        _unsubscribe("screens-resized", "resize-list-wrapper");

                        _unsubscribe("product-list-rendered", "filter-by-manufacturer");

                        _unsubscribe("product-metadata-updated", "update-product-list");
                        _unsubscribe("requeue-failed-transaction", "update-product-list");
                        
                        _subscribe_once("setup-complete", "cleanup-product-list", function(){
                            
                            setTimeout(function(){
                                
                                product_list_wrapper.innerHTML = "";
                                

                                manufacturer_list_wrapper.selectedIndex = 0;

                                if ("createEvent" in document) {
                                    var evt = document.createEvent("HTMLEvents");
                                    evt.initEvent("change", false, true);
                                    manufacturer_list_wrapper.dispatchEvent(evt);
                                }
                                
                                else {
                                    manufacturer_list_wrapper.fireEvent("onchange");
                                }

                                manufacturer_list_wrapper.removeEventListener("change", manufacturer_filter);
                            }, 150);
                        });
                    }

                    function product_list_wrapper_scroll(e){

                        var click_target = e.target,
                            product_list_touch_pos = e.changedTouches[0].clientY;


                        // filter events that arent from the product list
                            while( click_target != product_list_wrapper ){

                                if( click_target.parentNode == screen || click_target.parentNode == document.body ){ return; }
                                click_target = click_target.parentNode;
                            }

                        // prevent product list scroll from bubbling to body where all touchmove events go to die
                            if( (click_target.scrollTop < (click_target.scrollHeight - click_target.clientHeight) && product_list_touch_pos - product_list_touchstart_pos < 0) || (click_target.scrollTop > 0 && product_list_touch_pos - product_list_touchstart_pos > 0 )){ 
                                
                                e.stopPropagation(); 
                            }
                    }

                    function set_scroll_touch_position(e){

                        product_list_touchstart_pos = e.changedTouches[0].clientY;
                    }

                    function resize_list_wrappers(){

                        resize_product_list_wrapper();
                    }

                    function resize_product_list_wrapper(){

                        product_list_wrapper.style.height = (screen.offsetHeight * 0.7) + "px";
                    }

                    function resize_manufacturer_list_wrapper(){

                        manufacturer_list_wrapper.style.height = (screen.offsetHeight * 0.2) + "px";
                    }

                    function render_manufacturer_list(){

                        var markup = "<option value='-1'>ALL</option>",
                            manufacturer_db_json,
                            manufacturer_db;

                        // load
                            deviceStorage.get("manufacturer", function(ok, value){

                                // if local data exists, render it
                                    if(ok && value !== null){

                                        manufacturer_db_json = value;
                                        do_list_rendering();
                                    }

                                // rerender list when next the metadata is updated
                                    _subscribe_once(

                                        "manufacturer-metadata-updated",
                                        "render-product-list",
                                        function(data){

                                            manufacturer_db_json = data.notificationParams;
                                            do_list_rendering();
                                        }
                                    );
                                
                                // check for updates
                                    download_current_manufacturer_db();
                            });

                            function do_list_rendering(){

                                // get array of manufacturers
                                    manufacturer_db = JSON.parse(manufacturer_db_json);

                                // sort manufacturers alphabetically
                                    manufacturer_db.sort(function(a, b){

                                        a = a.Name.toLowerCase();
                                        b = b.Name.toLowerCase();

                                        if(a > b){ return 1; }
                                        else if(b > a){ return -1; }
                                        else { return 0; }
                                    });

                                // add each option to the markup
                                    for(var manufacturer in manufacturer_db){

                                        markup += "<option value='" + manufacturer_db[manufacturer].Id + "'>" + manufacturer_db[manufacturer].Name.toUpperCase() + "</option>"; 
                                    }

                                // render liost
                                    manufacturer_list_wrapper.innerHTML = markup;
                            }
                    }

                    function render_product_list(){

                        var markup = "",

                            product_db_json,
                            transaction_db_json,
                            manufacturer_db_json;

                        // load required db data
                            deviceStorage.get("product", function(ok, value){

                                if(ok && value !== null){

                                    product_db_json = value;

                                    if(all_dbs_loaded()){

                                        do_list_rendering();
                                    }
                                }

                                _subscribe_once(

                                    "product-metadata-updated",
                                    "render-product-list",
                                    function(data){

                                        product_db_json = data.notificationParams;

                                        if(all_dbs_loaded()){

                                            do_list_rendering();
                                        }
                                    }
                                );

                                download_current_product_db();
                            });

                            deviceStorage.get("manufacturer", function(ok, value){

                                if(ok && value !== null){

                                    manufacturer_db_json = value;

                                    if(all_dbs_loaded()){

                                        do_list_rendering();
                                    }
                                }

                                _subscribe_once(

                                    "manufacturer-metadata-updated",
                                    "render-product-list",
                                    function(data){

                                        manufacturer_db_json = data.notificationParams;

                                        if(all_dbs_loaded()){

                                            do_list_rendering();
                                        }
                                    }
                                );

                                download_current_manufacturer_db();
                            });

                            deviceStorage.get("transaction", function(ok, value){

                                if(ok && value !== null){

                                    transaction_db_json = value;

                                    if(all_dbs_loaded()){

                                        do_list_rendering();
                                    }
                                }

                                else {

                                   transaction_db_json = "{}";

                                    if(all_dbs_loaded()){

                                        do_list_rendering();
                                    }                                   
                                }
                            });

                        function do_list_rendering(){

                            // required vars
                                var model_to_render,
                                    model_length,

                                    product_db,
                                    transaction_db,
                                    manufacturer_db,

                                    product_db_id_model,
                                    manufacturer_db_id_model;

                            // create dbs and models needed
                                manufacturer_db = JSON.parse(manufacturer_db_json);
                                transaction_db = JSON.parse(transaction_db_json);
                                product_db = JSON.parse(product_db_json);
                                
                                product_db_id_model = key_model_db_json(product_db_json, 'Id');                              
                                manufacturer_db_id_model = key_model_db_json(manufacturer_db_json, 'Id');

                            // set base model to render
                                model_to_render = product_db;

                            // add transaction　data to model being rendered
                                if(!transaction_db.product){ transaction_db.product = {}; }
                                
                                for (var this_product_id in transaction_db.product) {

                                    // required vars
                                        var this_product = transaction_db.product[ this_product_id ];

                                    // filter
                                        if( !transaction_db.product.hasOwnProperty(this_product_id) ){ continue; }

                                    // update to existing product
                                        if(typeof product_db_id_model[ this_product_id ] != 'undefined'){

                                            // overlay product's transaction properties over its product db properties
                                                product_db_id_model[ this_product_id ] = copyObj({

                                                    "srcObj": transaction_db.product[ this_product_id ],
                                                    "output": product_db_id_model[ this_product_id ]
                                                });
                                        }

                                    // new product
                                        else {

                                            // required vars
                                                var manufacturer_db_name_model = key_model_db_json(manufacturer_db_json, "Name"),
                                                    confirmed_manufacturer_id;
                                                
                                            // if manufacturer exists, get its id
                                                if(manufacturer_db_name_model[ this_product.manufacturer.toLowerCase() ]){  

                                                    // set manufacturer id
                                                        confirmed_manufacturer_id = manufacturer_db_name_model[ this_product.manufacturer.toLowerCase() ].Id;
                                                }

                                            // inject product into list view data-source
                                                model_to_render.push(
                                                    
                                                    // overlay transaction data over acquired data
                                                        copyObj({
                                                            "srcObj": this_product,
                                                            "output": 
                                                                { 
                                                                    "Id": this_product_id,
                                                                    "Name": this_product.name,
                                                                    "ManufacturerId": (confirmed_manufacturer_id ? confirmed_manufacturer_id : "n/a")
                                                                }
                                                        })
                                                );
                                        }
                                }

                            // cache length of render model
                                model_length = model_to_render.length;

                            // filter empty render model
                                if(!model_to_render || model_length < 1){

                                    markup += "there are no products to display";
                                }

                            // process data models for rendering
                                else {

                                // alpha-sort model to render
                                    model_to_render.sort(function(a, b){

                                        a = a.Name.toLowerCase();
                                        b = b.Name.toLowerCase();

                                        if(a > b){ return 1; }
                                        else if(b > a){ return -1; }
                                        else { return 0; }
                                    });

                                // each product in model to render
                                    for (var i = model_to_render.length; i > 1; i--) {

                                        // required vars
                                            var product = model_to_render[ model_length - i ],
                                                
                                                product_id = product.Id,
                                                manufacturer_id = product.ManufacturerId,

                                                has_updates,
                                                has_retail_price_update,
                                                has_wholesale_price_update,
                                                
                                                retail_price,
                                                wholesale_price;

                                        // set flags
                                            has_updates = transaction_db.product[ product_id ] ? true : false;
                                            has_retail_price_update = has_updates && transaction_db.product[ product_id ].RetailPrice ? true : false;
                                            has_wholesale_price_update = has_updates && transaction_db.product[ product_id ].WholesalePrice ? true : false;
                                        
                                        // set prices
                                            retail_price = has_retail_price_update && product_db_id_model[product_id] ? "&#8358;" + product_db_id_model[product_id].RetailPrice : product.RetailPrice ? "&#8358;" + product.RetailPrice : "-----";                                        
                                            wholesale_price = has_wholesale_price_update && product_db_id_model[product_id] ? "&#8358;" + product_db_id_model[ product_id ].WholesalePrice : product.WholesalePrice ? "&#8358;" + product.WholesalePrice : "-----";
                                        
                                        // add product to markup being rendered 
                                            markup +=   "<div class='product" + (has_updates ? " editted-product" : "") + "' " + 
                                                            "data-product-name='" + product.Name + "' " +
                                                            "data-product-id='" + product_id + "' " + 
                                                            "data-manufacturer-id='" + manufacturer_id + "'" + 
                                                        ">" + 
                                                            "<div class='name'>" + 
                                                                "<span class='collapsed-content'>" + manufacturer_db_id_model[ manufacturer_id ].Name + "</span> " + 
                                                                product.Name + 
                                                            "</div>"+

                                                            "<div class='wholesale-price" + (has_wholesale_price_update ? " modified-value" : "") + "'>" + 
                                                                wholesale_price  + 
                                                            "</div>" + 

                                                            "<div class='retail-price" + (has_retail_price_update ? " modified-value" : "") + "'>" + 
                                                                retail_price  + 
                                                            "</div>" + 

                                                            "<div class='settings'>"+
                                                                "<span>edit</span>"+
                                                            "</div>"+
                                                        "</div>";
                                    }                                    
                                    
                                }
                            
                            // render markup and publish
                                product_list_wrapper.innerHTML = markup;
                                _publish("product-list-rendered", null, "render-product-list");
                        }

                        function all_dbs_loaded(){

                            var load_status = false;

                            if(
                                typeof product_db_json != "undefined" &&
                                typeof transaction_db_json != "undefined" &&
                                typeof manufacturer_db_json != "undefined"
                            ){

                                load_status = true;
                            }

                            return load_status;
                        }
                    }                        

                    function edit_product(e){

                        // required vars
                            var edit_btn = e.target,
                            
                            click_target,
                            click_target_id,

                            edit_options_markup,
                            edit_options,
                            edit_wholesale_price_btn,
                            edit_retail_price_btn,
                            
                            set_price_prompt;

                        // filter events that arent from the edit btn
                            while( !hasClass(edit_btn, "settings") ){

                                if( edit_btn.parentNode == product_list_wrapper || edit_btn.parentNode == document.body ){ return; }
                                
                                edit_btn = edit_btn.parentNode;
                            }

                        // identify the product
                            click_target = edit_btn.parentNode;

                        // if options menu is already open ... bail
                            if(edit_btn.getElementsByClassName('options').length > 0){

                                return;
                            }

                            addClass(click_target, "edit-product");

                            click_target_id = click_target.getAttribute('data-product-id');

                        // display edit options
                            edit_options_markup = "<ul class='options'>" + 
                                                    "<li class='edit-wholesale-price'>wholesale price</li>" + 
                                                    "<li class='edit-retail-price'>retail price</li>" + 
                                                  "</ul>";

                            edit_btn.innerHTML += edit_options_markup;

                        // get dom nodes of options
                            edit_options = edit_btn.getElementsByClassName('options')[0];
                            edit_wholesale_price_btn = edit_options.getElementsByClassName('edit-wholesale-price')[0];
                            edit_retail_price_btn = edit_options.getElementsByClassName('edit-retail-price')[0];

                        // activate edit options
                            edit_retail_price_btn.addEventListener('click', set_retail_price);
                            edit_wholesale_price_btn.addEventListener('click', set_wholesale_price);

                        // add options removal on next click to event stack
                            setTimeout(function(){

                                screen.addEventListener('click', remove_edit_options_menu);                                
                            }, 0);


                        function remove_edit_options_menu(){

                            // remove edit options
                                edit_options.parentNode.removeChild(edit_options);

                            // remove visual identifier
                                removeClass(click_target, "edit-product");

                            // cleanup option remover
                                screen.removeEventListener('click', remove_edit_options_menu);
                        }

                        function set_retail_price(){
                            
                            // required vars
                                var product_price = click_target.getElementsByClassName('retail-price')[0],
                                    current_price = product_price.innerHTML,
                                    clean_price = current_price.replace(/\D/g,"");
                                //  click_target_id -- from edit_product scope 

                            // get user-entered price
                                set_price_prompt = prompt(click_target.getAttribute('data-product-name').toUpperCase() + " - Retail Price", clean_price).replace(/\D/g,"");

                            // filter cancels
                                if(set_price_prompt === null || (set_price_prompt === clean_price && current_price === '-----') ){ return; }
                            
                            // update UI
                                if(set_price_prompt === '0' || set_price_prompt === ''){ 

                                    set_price_prompt = null;
                                    product_price.innerHTML = "-----";
                                } 

                                else {
                                    
                                    product_price.innerHTML = "&#8358;" + set_price_prompt;
                                }

                            // update dbs
                                update_product_retail_price(click_target_id, set_price_prompt);
                                    
                                addClass(product_price, "modified-value");
                                addClass(click_target, "editted-product");
                        }

                        function set_wholesale_price(){

                            // required vars
                                var product_price = click_target.getElementsByClassName('wholesale-price')[0],
                                    current_price = product_price.innerHTML,
                                    clean_price = current_price.replace(/\D/g,"");
                            
                            // get new price 
                                set_price_prompt = prompt( click_target.getAttribute('data-product-name').toUpperCase() + " - Wholesale Price", clean_price).replace(/\D/g,"");

                            // filter cancels
                                if(set_price_prompt === null || (set_price_prompt === clean_price && current_price === '-----') ) { return; }
                            
                            // update UI
                                if(set_price_prompt === '0' || set_price_prompt === ''){ 

                                    set_price_prompt = null;
                                    product_price.innerHTML = "-----";
                                } 

                                else {
                                    
                                    product_price.innerHTML = "&#8358;" + set_price_prompt;
                                }

                                update_product_wholesale_price(click_target_id, set_price_prompt);
                                
                                addClass(product_price, "modified-value");
                                addClass(click_target, "editted-product");
                        }
                    }

                    function manufacturer_filter(e){

                        var dropdown = e.target,
                            dropdown_selection = dropdown.options[dropdown.selectedIndex],
                            selected_manufacturer_id = dropdown_selection.value,
                            product_list = product_list_wrapper.getElementsByClassName('product');

                            if(selected_manufacturer_id == -1){

                                removeClass(product_list_wrapper, "filtered");
                            }

                            else{

                                addClass(product_list_wrapper, "filtered");
                            } 

                            for(var id in product_list){

                                var product = product_list[id];

                                if(typeof product.parentNode == "undefined"){ continue; }

                                if(product.getAttribute('data-manufacturer-id') == selected_manufacturer_id){

                                    addClass(product, 'manufacturer-filter-match');
                                }

                                else {
                                    
                                    removeClass(product, 'manufacturer-filter-match');
                                }
                            }                        
                    }

                    function update_product_wholesale_price(product_id, price){

                        create_transaction('product', product_id, 'WholesalePrice', price);
                    }

                    function update_product_retail_price(product_id, price){
                        
                        create_transaction('product', product_id, 'RetailPrice', price);
                    }
                }

        /* SCREEN UTILS */

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
                    addToActiveScreens('view-product');
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

            // send transaction to server
                function doTransaction(){ 

                    // req vars
                    var stopTransactions = function(){

                        clearInterval( intervals.transaction );
                        delete intervals.transaction;
                    };

                    // check every 30 secs
                        intervals.transaction = setInterval( function(){

                            deviceStorage.get('transaction', function(ok, value){

                                var transactions = JSON.parse(value),
                                    has_transactions = false;

                                if(!transactions){ return }

                                for(var data in transactions){ if(transactions.hasOwnProperty(data)){ has_transactions = true; break; } }

                                if(!has_transactions){ return }

                                HTTP_POST(

                                    "process-transaction.php",
                                    "transaction=" + value,
                                    function(){

                                        var transaction_json = value,
                                            resend_prompt; 

                                        return function(response_json){

                                            var response;

                                            try {

                                                response = JSON.parse(response_json);
                                            } 

                                            catch(e){

                                                console.log("TRANSACTION ERROR");

                                                // put failed transaction back on the transaction queue
                                                    deviceStorage.get('transaction', function(ok, transaction_queue_json){

                                                        var requeue_json;

                                                        if(transaction_queue_json){

                                                            requeue_json = JSON.stringify(
                                                                copyObj({

                                                                    'srcObj': JSON.parse(transaction_queue_json),
                                                                    'output': JSON.parse(transaction_json)
                                                                })
                                                            );
                                                        }

                                                        else {

                                                            requeue_json = transaction_json;
                                                        }

                                                        deviceStorage.set('transaction', requeue_json);
                                                        
                                                        _publish(
                                                            'requeue-failed-transaction',
                                                            {
                                                                "failed_transaction": transaction_json,
                                                                "server_response": response_json,
                                                                "queue_before_retry": transaction_queue_json,
                                                                "requeue_json": requeue_json
                                                            },
                                                            'do-transaction' 
                                                        );
                                                    });

                                                return false;
                                            }

                                            console.log("-- TRANSACTION REPORT --");

                                            // product updates in the transaction
                                                if(response.product){

                                                    deviceStorage.get('product', function(ok, value){

                                                        var product_db_json = value,
                                                            product_db = JSON.parse(product_db_json);
                                                        
                                                        for(var id in response.product){

                                                            var product_name = "oops! :'(";

                                                            // get product name
                                                                if(response.product[id].name){

                                                                    product_name = response.product[id].name;
                                                                }

                                                                else {

                                                                    var product_db_id_model = key_model_db_json(product_db_json, "Id");

                                                                    if(product_db_id_model[id]){

                                                                        product_name = product_db_id_model[id].Name;
                                                                    }

                                                                    else {

                                                                        var created_products_search = {},
                                                                            search_id;

                                                                        for (search_id in response.product) {                                                                            

                                                                            if(search_id.indexOf('create-') !== 0){ continue }

                                                                            created_products_search.product = response.product[search_id];

                                                                            if(created_products_search.product.product_id == id){

                                                                                product_name = created_products_search.product.name;
                                                                                break;
                                                                            }
                                                                        }                                                   
                                                                    }

                                                                }

                                                            // log updates
                                                                for(var property in response.product[id]){

                                                                    if(property === 'name'){ continue; }

                                                                    console.log(product_name.toUpperCase() + " " + property.toUpperCase() + " UPDATED TO '" + response.product[id][property] + "'");
                                                                }
                                                        }

                                                        _publish('transaction-metadata-updated', null, 'do-transaction');
                                                        download_current_product_db();
                                                    });
                                                }
                                        };
                                    }()
                                );

                                deviceStorage.set('transaction', "{}");
                            });

                        }, 1000 * 60 * 0.5);

                    // stop transaction on disconnect from the internet
                        _subscribe_once(
                            "network-down",
                            "transaction",
                            stopTransactions,
                            null
                        );
                }

            // update product db
                function download_current_product_db(){

                    download_to_local_db('product', 'get-product.php');
                }

            // update manufacturer db
                function download_current_manufacturer_db(){

                    download_to_local_db('manufacturer', 'get-manufacturer.php');
                }

            // download updates to db on device
                function download_to_local_db(db_name, url){

                    if(!db_name || !url){

                        return false;
                    }

                    deviceStorage.get(db_name, function(ok, value){
                        
                        // get product db via ajax
                            HTTP_POST(
                                url, 
                                null,
                                function(response){

                                    // filter unchanged list
                                        if(value === response) { return; }
                                        
                                    // update the pricelist
                                        deviceStorage.set(db_name, response);
                                    
                                    _publish(db_name + "-metadata-updated", response, "download-current-" + db_name + "-db");
                                }
                            );
                    });
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

                    // Online -> Process Pending Transactions
                        _subscribe( 'network-up', 'transaction', doTransaction );

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
                }


        /* OFFLINE STORAGE */

            // create device storage
                function createDeviceStorage(){

                    deviceStorage = new Persist.Store('Pricing App Storage', {

                        about: "Data Storage to enhance Offline usage",
                        path: location.href
                    });
                }

            // locally store data to push server-side
                function create_transaction(type, id, property, value){
                            
                    // required vars
                        var transactions_json = '{}';

                    // get transactions on device
                        deviceStorage.get("transaction", function(ok, cache){

                            // update transaction json on cache hit
                                if(cache && JSON.parse(transactions_json)){ transactions_json = cache; }

                            // add product update to next transaction
                                transaction_db = JSON.parse(transactions_json);

                                if(!transaction_db[type]){ transaction_db[type] = {}; }

                                if(!transaction_db[type][id]){ transaction_db[type][id] = {}; }
                                
                                transaction_db[type][id][property] = value;

                            // store it
                                deviceStorage.set('transaction', JSON.stringify(transaction_db));

                            // publish
                                _publish("transaction-metadata-updated", {'type': type, 'id': id, 'property': property, 'value': value }, "create-" + type + "-transaction");
                        });
                }

        /* UTILS */

            // subscribe once
                function subscribe_once(notification, subscriber, response, responseParams){

                    _subscribe(
                        notification, 
                        subscriber,

                        function(data){

                            response(data);
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

            // model json by key
                function key_model_db_json( db_json, key ){

                    var db,
                        modelled_db = {};

                    db = JSON.parse( db_json );

                    for(var row in db){

                        modelled_db[ db[row][key] ] = db[row];
                        modelled_db[ db[row][key] ]['db-index'] = row;
                    }

                    return modelled_db;
                }



            // model db by collection
                function collection_model_db_json( db_json, key ){

                    var db,
                        modelled_db = {};

                    db = JSON.parse( db_json );

                    for(var row in db){

                        if( !modelled_db[ db[row][key] ] ){  modelled_db[ db[row][key] ] = {}; }
                        
                        db[row]['db-index'] = row;
                        modelled_db[ row[key] ].push( db[row] );
                    }

                    return modelled_db;
                }

            // context settings - cancel task
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

            // context settings - add product
                function create_add_product_btn(){

                    var contextSettingsMenu = document.getElementById('context-settings'),
                        addProductBtnMarkup = "<div id='start-add-product' class='setting'>+ add product</div>";

                    // create add product button                            
                        contextSettingsMenu.innerHTML += addProductBtnMarkup;

                    // remove btn when task ends
                        _subscribe_once("teardown-screen", "remove-add-product-btn", 

                            function(){

                                var add_product_btn = document.getElementById('start-add-product');

                                add_product_btn.parentNode.removeChild(add_product_btn);
                            }
                        );

                    // set behavior
                        document.getElementById('start-add-product').addEventListener("click", addProductsWorkflow);
                }            

            // is object
                function isObj(item){

                    return (Object.prototype.toString.call(item) === '[object Object]');
                }

            // is array
                function isArray(item){

                    return (Object.prototype.toString.call(item) === '[object Array]');
                }

            // in array
            // - @params: {item, array}
            // - @returns: array index if item is in array, -1 if item is not in array, false if some required param was messed up 
                function inArray(params){

                    // return false if there is a missing/broken parameter
                    if (!params || !isObj(params) || !params.item || !isArray(params.array)) {

                        return false;   
                    }

                    // check array for item
                    for (var i in params.array){

                        // return index if it exists
                        if (params.item === params.array[i]) {
                            return i;
                        }
                    }

                    // return -1 if it doesn't exist 
                    return -1;
                }

            // copy Object
            // - @params: {srcObj [,output ,]}
            // - @returns: {} or output on success, false on fail
                function copyObj(params){

                    // exit if params are improper (params not an object, no source object, source object isn't a true object)
                    if (!isObj(params) || !params.srcObj || !isObj(params.srcObj) ) {

                        return false;
                    }

                    // use defined output or plain obj for return
                    var output = (isObj(params.output) ? params.output : {});

                    // check if there's any items to skip in the copy process
                    var skip = (params.skip && isArray(params.skip) && params.skip.length > 0);

                    // start copying
                    for (var i in params.srcObj){

                        if (params.srcObj.hasOwnProperty(i)){

                            // ensure item isn't on the skip list
                            if (skip === true && inArray({"item": i, "array": params.skip }) > -1 ) {

                                continue;
                            }

                            // write 
                            output[i] = params.srcObj[i];
                        }    
                    }

                    return output;
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
            currentIntervals = intervals;
            peepDB = function(db_name){

                deviceStorage.get(db_name, function(ok, value){

                    if(!ok){ console.log("couldn't retrieve " + db_name + " db"); return; }

                    console.log( JSON.parse(value) );
                });
            };
        });
}());