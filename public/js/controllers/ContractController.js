angular.module('BlocksApp').controller('ContractController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.addr;

    //fetch compiler options
    $http.get('COMPILERS.json')
       .then(function(res){
          $scope.compilerVersions = res.data;                
        });

    $scope.form = {};
    $scope.contract = {"address": $stateParams.addr} 
    $scope.errors = {};
    
    $scope.submitCode = function() {
      console.log($scope.contract)
      // validate
      
      if (!isAddress($scope.contract.address)) 
        $scope.errors.address = "Invalid Address";
      if (typeof $scope.contract.name == "undefined")          
        $scope.errors.name = "Contract Name Required";
      if (typeof $scope.contract.version == "undefined")
        $scope.errors.version = "Compiler Version Required"
      if (typeof $scope.contract.code == "undefined")
        $scope.errors.code = "Invalid Contract Code"

      if (Object.keys($scope.errors) < 1) {
        var contractReq = $scope.contract;
        contractReq.action = "compile";

        // send to web3 for validation
        $http({
          method: 'POST',
          url: '/compile',
          data: contractReq
        }).success(function(data) {
          console.log(data);
          $scope.contract = data;
          $scope.contract.compiled = true;
        });
      }
      else
        return;
    }

})