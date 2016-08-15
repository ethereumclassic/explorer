angular.module('BlocksApp').controller('StatsController', function($stateParams, $rootScope, $scope) {

    $rootScope.isHome = false;
    $rootScope.$state.current.data["pageTitle"] = "ETC Hashrate Growth"
    
})