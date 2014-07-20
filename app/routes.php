<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

Route::get('/', array('as' => 'home', function() 
{
	if (Session::has('module')) {
		Log::info('Old session from module');
		Session::remove('module');
	}
	if (Session::has(user)) {
		$user = Session::get(user);
		Log::info('Logged user: ' . $user->uid);
		$privileges = DB::table('auth')->where('token','=', $user->uid)->lists('atlas_id');
		$list = json_encode($privileges);
		Log::info('Authorized site: ' . $lists);
		return View::make('index', array('user' => $user, 'auth_site' => $list));
	}
	Log::info('Unknow user');
	return View::make('index');
}));

Route::delete('ping.php', array(
	'before' => 'secret',
	'uses' => 'PingController@pingDelete'));

Route::post('ping.php/atlas', array(
	'before' => 'validateAtlasJson',
	'uses' => 'PingController@pingAtlas'));

Route::delete('ping.php/atlas', array(
	'before' => 'validateAtlasDelete',
	'uses' => 'PingController@pingAtlasDelete'));

Route::post('ping.php/module', array(
	'before' => 'validateAtlasDelete',
	'uses' => 'PingController@pingPostModule'));

Route::delete('ping.php/module', array(
	'before' => 'validateAtlasDelete',
	'uses' => 'PingController@pingDelete'));

Route::post('ping.php', array(
	'before' => 'validateJson',
	'uses' => 'PingController@pingPost'));

Route::get('data.php', array(
	'before' => 'validateCallback',
	'uses' => 'DataController@getData'));

Route::get('auth/multipass/callback', array(
	'before' => 'multipass',
	'uses' => 'AuthController@decodeMultipass'));

Route::get('logout', array('as' => 'logout', function()
{
    $idServer = getenv('ID_HOST');
    Auth::logout();
    Log::info('User logged out');
    Session::remove('user');
    if (Session::has('module'))
		$url = urlencode(route('close'));
	else {
    	$url = urlencode(route('home'));
    }
    return Redirect::to($idServer.'/disconnect?destination='. $url);
}));

Route::get('login', array('as' => 'login', function()
{
    $idServer = getenv('ID_HOST');
    return Redirect::to($idServer.'/authenticate/atlas');
}));

Route::get('capture', array(
	'as' => 'capture',
	'before' => 'isAdmin',
	'uses' => 'AtlasController@takeCapture'));

Route::get('screenshot', array(
	'as' => 'download',
	'uses' => 'AtlasController@cronCapture'));

Route::get('download', array(
	'as' => 'cron',
	'uses' => 'AtlasController@downloadCapture'));

Route::match(array('GET', 'POST'), 'admin', array(
	'as' => 'admin',
	'before' => 'isAdmin',
	'uses' => 'AdminController@adminQuery'));

Route::get('module/close', array('as' => 'close', function() {
	if (!Session::has('module'))
		return Redirect::route('/');
	return Response::view('close');
}));

Route::get('module/login', array('as' => 'module-login', function() {
	if (Session::has('user'))
		return Redirect::route('module', array('module' => Input::get('module')));
	return Response::view('module');
}));

Route::get('module', array('as' => 'module', 'before' => 'module', function() 
{
	Session::set('module', true);
	Session::flash('module', $module);
	if (Session::has(user)) {
		$module = Input::get('module');
		$moduleSite = DB::table('auth')->where('token','=', $module)->lists('atlas_id');
		$user = Session::get(user);
		Log::info('Logged user: ' . $user->uid);
		$privileges = DB::table('auth')->where('token','=', $user->uid)->lists('atlas_id');
		$list = json_encode($privileges);
		$listM = json_encode($moduleSite);
		Log::info('Authorized site: ' . $list);
		Log::info('Authorized module: ' . $listsM);
		return View::make('index', array('user' => $user,'mod_site' => $listsM,
		 'auth_site' => $list, 'module' =>  Input::get('module')));
	}
	return Redirect::route('module-login', array('module' => Input::get('module')));
}));