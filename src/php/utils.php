<?php
# -----------------------------------------------
# DB CONFIGS

<% 
	// GRUNT TEMPLATE PROCESSING ENV

	var build_env = grunt.config('build-env') || 'debug',
		env_db_credentials;

		env_db_credentials = dbcredentials[ build_env ] ? dbcredentials[ build_env ] : false;

		if(env_db_credentials === false){
		%>

		    $url=parse_url(getenv("CLEARDB_DATABASE_URL"));

			define ("DB_USER", $url["user"]);
			define ("DB_PASSWORD", $url["pass"]);
			define ("DB_HOST", $url["host"]);	
			define ("DB_NAME", substr($url["path"],1));
		<%
		}

		else { 
		%>

			define ("DB_USER", '<%= env_db_credentials.user %>');
			define ("DB_PASSWORD", '<%= env_db_credentials.password %>');
			define ("DB_HOST", '<%= env_db_credentials.host %>');	
			define ("DB_NAME", '<%= env_db_credentials.database %>');
		<%
		}  
%>

# -----------------------------------------------
# CONSTANTS


	define ("DB_PRODUCT_TABLE", 'product');
	define ("DB_MANUFACTURER_TABLE", 'manufacturer');
	define ("DB_PRODUCT_ALIAS_TABLE", 'product_alias');

	define ("DB_RETAIL_PRICE_COLUMN", 'RetailPrice');
	define ("DB_WHOLESALE_PRICE_COLUMN", 'WholesalePrice');


# -----------------------------------------------
# DATABASE

	// update product price
		function update_price($product_id, $price, $price_type = null){

			// req vars
				$response = array();
				$response['success'] = false;
				$column_name;

			// filter missing vars
				if(!$product_id){

					$response['msg'] = "PRODUCT ID FOR PRICE UPDATE IS MISSING";
					return $response;
				}
				
				if(empty($price) && $price !== null ){

					$response['msg'] = "NO UPDATED PRICE TO STORE";
					return $response;
				}

				if(!$price_type || $price_type == "retail"){

					$column_name = DB_RETAIL_PRICE_COLUMN;
				}

				elseif($price_type == "wholesale"){
					
					$column_name = DB_WHOLESALE_PRICE_COLUMN;
				}


			// update db
				$update_price_querystring = "UPDATE `" . DB_NAME ."`.`". DB_PRODUCT_TABLE . "` SET `" . $column_name . "` = '" . $price . "' WHERE `Id` = " . $product_id;
				$update_price_query = mysql_query( $update_price_querystring );

				if(!$update_price_query){

					$response['msg'] = mysql_error();
				}

				else {

					$response['success'] = true;
					$response['msg'] =  $price_type . ' PRICE FOR PRODUCT ID ' . $product_id . ' UPDATED TO "' . $price . '"';					
				}

			return $response;
		}

	// add product to database		
		function add_product($name, $manufacturer){

			// req vars
				$response = array();
				$response['success'] = false;

			// filter missing params
				if (!$name){ 

					$response['msg'] = "NO PRODUCT NAME TO STORE";
					return $response; 
				}

				else if (!$manufacturer){ 

					$response['msg'] = "PRODUCT MANUFACTURER IS MISSING";
					return $response; 
				}

			// get manufacturer id
				$manufacturer_id;
				$get_manufacturer_id_querystring = "SELECT `Id` FROM `" . DB_MANUFACTURER_TABLE . "` WHERE `Name` = '" . $manufacturer . "' LIMIT 1";
				$get_manufacturer_id_query = mysql_query($get_manufacturer_id_querystring);

				if( mysql_num_rows($get_manufacturer_id_query) == 0 ){

					$store_manufacturer = add_manufacturer( $manufacturer );

					if($store_manufacturer['success'] == false){

						$response['msg'] = "COULD NOT RETRIEVE OR STORE MANUFACTURER";
						return $response;
					}
					
					$manufacturer_id = mysql_insert_id();
				} 

				else {

					while( $result = mysql_fetch_assoc($get_manufacturer_id_query) ){

						$manufacturer_id = $result["Id"];
					}
				}

			// prevent duplicate product entries for that manufacturer 
				$duplicate_product_check_querystring = "SELECT `Id`, `ManufacturerId` FROM `" . DB_PRODUCT_TABLE . "` WHERE `Name` = '" . $name . "'";
				$duplicate_product_check_query = mysql_query($duplicate_product_check_querystring);

				while( $result = mysql_fetch_assoc($duplicate_product_check_query) ){

					if( $manufacturer_id == $result['ManufacturerId']){

						$response['msg'] = "'" . $name . "' ALREADY EXISTS IN " . $manufacturer . "'S PRODUCT LIST";
						return $response;
					}
				}

			// mysql query
				$add_product_querystring = "INSERT INTO `" . DB_PRODUCT_TABLE . "` (`Name`, `ManufacturerId`) VALUES ('" . $name . "', '" . $manufacturer_id . "')";
				$add_product_query = mysql_query($add_product_querystring);

			// set response
				if(!$add_product_query){

					$response['msg'] = mysql_error();
					return $response;
				}
					
				$response['success'] = true;
				$response['msg'] = "'" . $name . "' ADDED TO PRODUCT DATABASE";
				$response['manufacturer_id'] = $manufacturer_id;
				$response['product_id'] = mysql_insert_id();

			// save product alias
				add_alias($name, $response['product_id']);

			// set product display alias
				$set_product_alias_querystring = "UPDATE `" . DB_PRODUCT_TABLE . "` SET `DisplayAliasId` = '" . mysql_insert_id() . "' WHERE `Id` = " . $response['product_id'];
				$set_product_alias_query = mysql_query($set_product_alias_querystring);
			
			return $response;
		}

	// add manufacturer to db
		function add_manufacturer($name){

			// req vars
				$response = array();
				$response['success'] = false;

			// filter missing reqs
				if(!$name){  

					$response['msg'] = "MANUFACTURER NAME NOT GIVEN";
					return $response;
				}

			// filter duplicate manufacturer entries
				$duplicate_manufacturer_querystring = "SELECT `Id` FROM `" . DB_MANUFACTURER_TABLE . "` WHERE `Name` = '" . $name . "' LIMIT 1";
				$duplicate_manufacturer_query = mysql_query($duplicate_manufacturer_querystring);

				if( mysql_num_rows($duplicate_manufacturer_query) > 0 ){

					$response['msg'] = "MANUFACTURER '" . $name . "' IS ALREADY IN THE DATABASE";
					return $response;
				}

			// mysql add manufacturer
				$add_manufacturer_querystring = "INSERT INTO `" . DB_MANUFACTURER_TABLE . "` (`Name`) VALUES ('" . $name . "')";
				$add_manufacturer_query = mysql_query($add_manufacturer_querystring);

				$response['success'] = true;
				$response['msg'] = "MANUFACTURER '" . $name . "' ADDED";
				$response['manufacturer_id'] = mysql_insert_id();		

				return $response;
		}

	// add alias to db
		function add_alias($alias, $product_id){

			// req vars
				$response = array();
				$response['success'] = false;

			// filter missing reqs
				if(!$alias){  

					$response['msg'] = "NO PRODUCT ALIAS RECEIVED";
					return $response;
				}

				if(!$product_id){  

					$response['msg'] = "NO PRODUCT ID RECEIVED";
					return $response;
				}
		
			// mysql add alias
				$add_alias_querystring = "INSERT INTO `" . DB_PRODUCT_ALIAS_TABLE . "` (`Alias`, `ProductId`) VALUES ('" . $alias . "', '" . $product_id . "')";
				$add_alias_query = mysql_query($add_alias_querystring);

				$response['success'] = true;
				$response['msg'] = "ALIAS '" . $alias . "' ADDED FOR PRODUCT " . $product_id;

				return $response;
		}

	// create a database
		function create_db($db_name, $options = null){

			if(!$options){ $options = "CHARACTER SET utf8 COLLATE utf8_general_ci"; }

			$create_db_querystring = "CREATE DATABASE " . $db_name . " " . $options;

			$query_status = mysql_query($create_db_querystring);

			return $query_status;
		}

	// create database table
		function create_table($table_name, $table_options = null, $db_name = DB_NAME){

			// required vars
				$response = array();
				$response['success'] = false;

			// filter existing tables
				if(table_exists( $table_name )){ 

					$response['msg'] = "TABLE '" . $table_name . "' ALREADY EXISTS IN '" . $db_name . "' DB";					
					return $response;
				}

			// craft querystring
				$create_table_querystring = "CREATE TABLE " . $table_name . " " . $table_options;

			// do query
				mysql_select_db($db_name, db_server_connect());
				
				$query = mysql_query($create_table_querystring);

			// prep response
				if (!$query){ 

					$response['msg'] = "TABLE '" . $table_name . "' CREATION QUERY FAILED";
				}

				else { 

					$response['success'] = true;
					$response['msg'] = "TABLE '" . $table_name . "' CREATED"; 
				}

			return $response;
		}

	// connect to DB server
		function db_server_connect(){

			$connect = mysql_connect(DB_HOST, DB_USER, DB_PASSWORD);

			if(!$connect){ die("COULDN'T CONNECT TO DB"); } 

			else{ return $connect; }
		}

# ----------------------------------------------- 
# UTILS

	// Get sha1 value of string 
		function get_hashsum($string){
			
			$clean_string = utf8_encode($string);
			$hashsum = sha1($clean_string);

			return $hashsum;
		}

	// Check if database exists
		function db_exists($db_name, $connection = null){

			$connection = $connection !== null ? $connection : db_server_connect();

			return mysql_select_db($db_name, $connection);				
		}

	// Check if table exists
		function table_exists($table_name, $db_name = DB_NAME){

			mysql_select_db( $db_name );

			return mysql_query('select 1 from `' . $table_name . '`');
		}
?>