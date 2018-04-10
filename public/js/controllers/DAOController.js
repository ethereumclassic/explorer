angular.module('BlocksApp').controller('DAOController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $scope.settings = $rootScope.setup;
    $scope.dao = {"balance": 0, "extra_balance": 0};

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/daorelay',
      data: {"action": "info"}
    }).success(function(data) {
      $scope.dao = data;
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
.directive('createdTokens', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/created-tokens.html',
    scope: false,
    link: function(scope, elem, attrs){
      // fetch created tokens
      scope.getCreatedTokens = function(last) {
        var data = {"action": "createdTokens"};
        if (last)
          data.last_id = last;

        $http({
          method: 'POST',
          url: '/daorelay',
          data: data
        }).success(function(data) {
          scope.created_tokens = data;
        });
      }

      scope.getCreatedTokens();
    }

  }
})
.directive('transferTokens', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/transfer-tokens.html',
    scope: false,
    link: function(scope, elem, attrs){
      // fetch created tokens
      scope.getTransferTokens = function(last) {
        var data = {"action": "transferTokens"};
        if (last)
          data.last_id = last;

        $http({
          method: 'POST',
          url: '/daorelay',
          data: data
        }).success(function(data) {
          scope.transfer_tokens = data;
        });
      }

      scope.getTransferTokens();
    }

  }
})
