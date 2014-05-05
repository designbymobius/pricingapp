<% 
	// GRUNT TEMPLATE PROCESSING ENV

	var build_env = grunt.config('build-env') || 'debug',
		env_db_credentials = dbcredentials[ build_env ];  
%>
<?php

# -----------------------------------------------
# CONSTANTS

	define ("DB_USER", '<%= env_db_credentials.user %>');
	define ("DB_PASSWORD", '<%= env_db_credentials.password %>');
	define ("DB_HOST", '<%= env_db_credentials.host %>');	
	define ("DB_NAME", '<%= env_db_credentials.database %>');

	define ("DB_PRODUCT_TABLE", 'product');
	define ("DB_PRODUCT_ALTNAME_TABLE", 'altname');
	define ("DB_PRODUCT_MANUFACTURER_TABLE", 'manufacturer');


# -----------------------------------------------
# DATABASE

	// connect to DB server
		function db_server_connect(){

			$connect = mysql_connect(DB_HOST, DB_USER, DB_PASSWORD);

			if (!$connect){ 

				die ("COULDN'T CONNECT TO DB");
			} 

			else {

				return $connect;
			}
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

			// filter products already in db
				$duplicate_product_check_querystring = "SELECT `Id` FROM `" . DB_PRODUCT_TABLE . "` WHERE `Name` = '" . $name . "' LIMIT 1";
				$duplicate_product_check_query = mysql_query($duplicate_product_check_querystring);

				if( mysql_num_rows($duplicate_product_check_query) > 0 ){

					$response['msg'] = "'" . $name . "' ALREADY EXISTS IN DATABASE (PRODUCT)";
					return $response;
				}

				$duplicate_altname_check_querystring = "SELECT `ProductId` FROM `" . DB_PRODUCT_ALTNAME_TABLE . "` WHERE `AltName` = '" . $name . "' LIMIT 1";
				$duplicate_altname_check_query = mysql_query($duplicate_altname_check_querystring);

				if( mysql_num_rows($duplicate_altname_check_query) > 0 ){
					
					$response['msg'] = "'" . $name . "' ALREADY EXISTS IN DATABASE (ALTNAME)";
					return $response;
				}

			// get manufacturer id
				$manufacturer_id;
				$get_manufacturer_id_querystring = "SELECT `Id` FROM `" . DB_PRODUCT_MANUFACTURER_TABLE . "` WHERE `Name` = '" . $manufacturer . "' LIMIT 1";
				$get_manufacturer_id_query = mysql_query($get_manufacturer_id_querystring);

				if (!$get_manufacturer_id_query) {
				    
				    $response['msg'] = "Could not successfully run query ($sql) from DB: " . mysql_error();
				    return $response;
				}

				else if(mysql_num_rows($get_manufacturer_id_query) == 0){

					$store_manufacturer = add_manufacturer( $manufacturer );

					if($store_manufacturer['success'] == false){

						$response['msg'] = "COULD NOT RETRIEVE OR STORE MANUFACTURER";
						return $response;
					}

					$check_for_manufacturer_query = mysql_query($get_manufacturer_id_querystring);

					while ($check_result = mysql_fetch_assoc($check_for_manufacturer_query)){
					
						$manufacturer_id = $check_result["Id"];
					}
				} 

				else {

					while( $result = mysql_fetch_assoc($get_manufacturer_id_query) ){

						$manufacturer_id = $result["Id"];
					}
				}

			// mysql query
				$add_product_querystring = "INSERT INTO `" . DB_PRODUCT_TABLE . "` (`Name`, `ManufacturerId`) VALUES ('" . $name . "', '" . $manufacturer_id . "')";
				$result = mysql_query($add_product_querystring);

			// set response
				if(!$result){

					$response['msg'] = mysql_error();
				}

				else {

					$response['success'] = true;
					$response['msg'] = "'" . $name . "' ADDED TO PRODUCT DATABASE";
				}
			
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
				$duplicate_manufacturer_querystring = "SELECT `Id` FROM `" . DB_PRODUCT_MANUFACTURER_TABLE . "` WHERE `Name` = '" . $name . "' LIMIT 1";
				$duplicate_manufacturer_query = mysql_query($duplicate_manufacturer_querystring);

				if (!$duplicate_manufacturer_query) {
				    
				    $response['msg'] = "Could not successfully run query ($sql) from DB: " . mysql_error();
				}

				else if( mysql_num_rows($duplicate_manufacturer_query) > 0 ){

					$response['msg'] = "MANUFACTURER '" . $name . "' IS ALREADY IN THE DATABASE";
				} 

				else {

					// mysql add manufacturer
						$add_manufacturer_querystring = "INSERT INTO `" . DB_PRODUCT_MANUFACTURER_TABLE . "` (`Name`) VALUES ('" . $name . "')";
						$add_manufacturer_query = mysql_query($add_manufacturer_querystring);

						$response['success'] = true;
						$response['msg'] = "MANUFACTURER '" . $name . "' ADDED";					
				}

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

			$connection = ($connection ? $connection : db_server_connect());

			return mysql_select_db($db_name, $connection);				
		}

	// Check if table exists
		function table_exists($table_name, $db_name = null){

			$db_name = ($db_name ? $db_name : DB_NAME);

			mysql_select_db( $db_name );

			return mysql_query('select 1 from `' . $table_name . '`');
		}
?>