angular.module('BlocksApp').controller('TokenController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash; //replace with token name
    $scope.token = {"balance": 0, "extra_balance": 0, "address": $stateParams.hash};

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/tokenrelay',
      data: {"action": "info"}
    }).success(function(data) {
      $scope.token = data;
    });

    $scope.form = {};
    $scope.errors = {};
    $scope.showTokens = false;
    $scope.getBalance = function(a) {
        var addr = a.toLowerCase();

        $scope.form.addrInput="";
        $scope.errors = {};

        $scope.form.tokens.$setPristine();
        $scope.form.tokens.$setUntouched();
        if (isAddress(addr)) {
          $http({
            method: 'POST',
            url: '/tokenrelay',
            data: {"action": "balanceOf", "addr": addr}
          }).success(function(data) {
            console.log(data)
            $scope.showTokens = true;
            $scope.dao.tokens = data.tokens;
          });
        } else 
            $scope.errors.address = "Invalid Address";

    }

})