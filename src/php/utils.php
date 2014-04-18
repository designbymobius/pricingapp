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

			// filter existing tables
				if(table_exists( $table_name )){ 

					$response['success'] = false;
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

					$response['success'] = false;
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