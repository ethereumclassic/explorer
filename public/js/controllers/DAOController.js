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
    }).then(function(resp) {
      $scope.dao = resp.data;
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
          }).then(function(resp) {
            console.log(resp.data)
            $scope.showTokens = true;
            $scope.dao.tokens = resp.data.tokens;
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
        }).then(function(resp) {
          scope.created_tokens = resp.data;
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
        }).then(function(resp) {
          scope.transfer_tokens = resp.data;
        });
      }

      scope.getTransferTokens();
    }

  }
})
