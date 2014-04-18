<?php
	
	// import utils
		require_once('utils.php');

	// required vars
		$product_table = 'product';
		$product_altname_table = 'altname';

	// check for database 
	// @: create if necessary 
		if(!db_exists( DB_NAME )){ 
			
			$create_db = create_db( DB_NAME );

			if (!$create_db){ echo "DB '" . DB_NAME . "' CREATION QUERY FAILED <br />"; } 
			else { echo "DB '" . DB_NAME . "' CREATED <br />"; }
		}

		else { echo "DB '" . DB_NAME . "' ALREADY EXISTS <br />"; }

	// product table
		$create_product_table = create_table(
			$product_table, 
			"(
				Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,					
				Name varchar(250) NOT NULL,
				Manufacturer varchar(250) NOT NULL
			)"
		);

		echo $create_product_table["msg"] . "<br />";
		
	// altname table
		$create_altname_table = create_table( 
			
			$product_altname_table, 
			"(
				ProductId varchar(250) NOT NULL,					
				AltName varchar(250) NOT NULL
			)"
		);

		echo $create_altname_table["msg"] . "<br />";

		mysql_close();
?>