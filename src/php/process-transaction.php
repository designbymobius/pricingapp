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

		if($transaction->product){

			$response['product'] = array();

			foreach ($transaction->product as $product_id => $product) {
				
				$price_update = update_price($product_id, $product->price);
				$response['product'][$product_id] = array("price"=>$product->price);
			}
		}

		echo json_encode($response);
?>