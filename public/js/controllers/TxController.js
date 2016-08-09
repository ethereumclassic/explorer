angular.module('BlocksApp').controller('TxController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.hash = $stateParams.hash;
    $scope.tx = {"hash": $scope.hash};

    //fetch from db
    $http({
      method: 'POST',
      url: '/tx',
      data: {"tx": $scope.hash}
    }).success(function(data) {
      console.log(data)
      if (data.error)
        $location.path("/err404/transaction/" + $scope.hash);
      else {
        $scope.tx = data;
        if (data.timestamp)
          $scope.tx.datetime = new Date(data.timestamp*1000); 
      }
    });


})
angular.module('BlocksApp')
.filter('timeDuration', function() {
  return function(timestamp) {
    return getDuration(timestamp).toString();
  };
})