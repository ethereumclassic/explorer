angular.module('BlocksApp').controller('TokenController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash; //replace with token name
    $scope.addrHash = isAddress($stateParams.hash) ? $stateParams.hash : undefined;
    var address = $scope.addrHash;
    $scope.token = {"balance": 0};
    $scope.settings = $rootScope.setup;

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/tokenrelay',
      data: {"action": "info", "address": address}
    }).then(function(resp) {
      console.log(resp.data)
      $scope.token = resp.data;
      $scope.token.address = address;
      $scope.addr = {"bytecode": resp.data.bytecode};
      if (resp.data.name)
        $rootScope.$state.current.data["pageTitle"] = resp.data.name;
    });

    // fetch transactions
    var fetchTxs = function(after) {
      var data = {"action": "transaction", "address": $scope.addrHash};
      if (after && after > 0) {
        data.after = after;
      }
      $http({
        method: 'POST',
        url: '/tokenrelay',
        data
      }).then(function(resp) {
        $scope.contract_transactions = resp.data.transaction;
        $scope.page = { count: resp.data.count, after: resp.data.after, next: resp.data.after + resp.data.count};
        if (resp.data.after > 0) {
          $scope.page.prev = resp.data.after - resp.data.count;
        } else {
          $scope.page.prev = 0;
        }
      });
    };

    fetchTxs();
    $scope.fetchTxs = fetchTxs;

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
            data: {"action": "balanceOf", "user": addr, "address": address}
          }).then(function(resp) {
            console.log(resp.data)
            $scope.showTokens = true;
            $scope.userTokens = resp.data.tokens;
          });
        } else 
            $scope.errors.address = "Invalid Address";

    }

})
.directive('contractSource', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/contract-source.html',
    scope: false,
    link: function(scope, elem, attrs){
        //fetch contract stuff
        $http({
          method: 'POST',
          url: '/compile',
          data: {"addr": scope.addrHash, "action": "find"}
        }).then(function(resp) {
          scope.contract = resp.data;
        });
      }
  }
})
.directive('transferTokens', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/transfer-tokens.html',
    scope: false,
    link: function(scope, elem, attrs) {
      //fetch transfer
      var getTransferTokens = function(after) {
      var data = {"action": "transfer", "address": scope.addrHash};
      if (after && after > 0) {
        data.after = after;
      }
      $http({
        method: 'POST',
        url: '/tokenrelay',
        data
      }).then(function(resp) {
        scope.transfer_tokens = resp.data.transfer;
        scope.page = {after: resp.data.after, count: resp.data.count};
        scope.page.next = resp.data.after + resp.data.count;
        if (resp.data.after > 0) {
          scope.page.prev = resp.data.after - resp.data.count;
        } else {
          scope.page.prev = 0;
        }
      });
      };
      scope.getTransferTokens = getTransferTokens;
      getTransferTokens();
    }
  }
})
