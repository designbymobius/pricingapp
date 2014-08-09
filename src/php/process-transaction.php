<?php
	
	// filter incomplete requests
		if(!$_POST || !$_POST['transaction']){ 

			die('TRANSACTION NOT RECEIVED');
		}

	// required variables		
		require_once('utils.php');
		$connection = db_server_connect();
		$database = mysql_select_db(DB_NAME, $connection);

		$transaction = json_decode($_POST['transaction']);

		$response = array();

	// product transactions
		if($transaction->product){

			$response['product'] = array();

			foreach ($transaction->product as $product_id => $product) {

				// prepare response
					$response['product'][$product_id] = array();
				
				// create product
					if( property_exists($product, "name") && property_exists($product, "manufacturer") ){

						$add_product_to_db = add_product($product->name, $product->manufacturer);
						if($add_product_to_db['success'] !== true){ continue; }
						
						$response['product'][$product_id]['name'] = $product->name;
						$response['product'][$product_id]['product_id'] = $add_product_to_db['product_id'];
						$response['product'][$product_id]['manufacturer_id'] = $add_product_to_db['manufacturer_id'];

					// update product id if product was successfully added
						$product_id = $add_product_to_db['product_id'];						 
					}
				
				// wholesale price updates
					if( property_exists($product, "WholesalePrice") ){

						$wholesale_price_update = update_price($product_id, $product->WholesalePrice, "wholesale");
						
						if($wholesale_price_update['success'] === true){

							$response['product'][$product_id]["WholesalePrice"] = $product->WholesalePrice;
						} 
					}
				
				// retail price updates
					if( property_exists($product, "RetailPrice") ){

						$price_update = update_price($product_id, $product->RetailPrice, "retail");
						
						if($price_update['success'] === true){
							
							$response['product'][$product_id]["RetailPrice"] = $product->RetailPrice;
						}
					}
			}
		}

		echo json_encode($response);
?>