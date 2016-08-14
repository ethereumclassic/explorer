angular.module('BlocksApp').controller('DAOController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $scope.dao = {"balance": 0, "extra_balance": 0};

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/daorelay',
      data: {"action": "info"}
    }).success(function(data) {
      console.log(data)
      $scope.dao = data;
    });

    // fetch created tokens
    $http({
      method: 'POST',
      url: '/daorelay',
      data: {"action": "createdTokens"}
    }).success(function(data) {
      console.log(data)
      $scope.created_tokens = data;
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
            url: '/daorelay',
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