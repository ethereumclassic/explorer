angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $http.get('/TOKENS.json')
      .then(function(res){
        $scope.tokens = res.data;
      })

})