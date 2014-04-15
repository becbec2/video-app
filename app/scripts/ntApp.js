angular.module('ntApp', ['ytCore', 'ngRoute', 'ntAnimations'])

    .constant('TPL_PATH', './templates')

    .run(['$rootScope', 'TPL_PATH', function ($rootScope, TPL_PATH) {
        $rootScope.tpl = function (file) {
            return TPL_PATH + '/' + file + '.html';
        };

        $rootScope.$on('$routeChangeStart', function () {
            $rootScope.$broadcast('ntLoadingStart');
        });
    }])


    .factory('getSet', function () {
        return function () {
            var val;
            return function (data) {
                return arguments.length ? (val = data) : val;
            };
        };
    })

    // [M5.1] Create a sub service called `appCategories` and inject the `$http` service.
    // [M5.2] Within `appCategories`, use $http to download the list of categories from `/categories.json`.

    // remove this
    .value('appCategories', function () { })
    // and implement this
    //.factory('appCategories', function() {
    //  return function() {
    //  }
    //});

    .config(function ($routeProvider, TPL_PATH) {
        $routeProvider.when('/', {
            controller: 'HomeCtrl',
            templateUrl: TPL_PATH + '/home.html',
            reloadOnSearch: false
        }).when('/watch/:id', {
            controller: 'WatchCtrl',
            templateUrl: TPL_PATH + '/watch.html',
            resolve: {
                videoInstance: ['ytVideo', '$location', function (ytVideo, $location) {
                    //match the ID with a regex instead of using route params
                    //since the route has not fully changed yet
                    var id = $location.path().match(/watch\/([^ \/]+)(\/|$)/)[1];
                    return ytVideo(id);
                }]
            }
        });
    })

    .directive('ntScrollToTop', ['$window', '$rootScope', function ($window, $rootScope) {
        return function () {
            $rootScope.$on('$routeChangeStart', function () {
                $window.scrollTo(0, 0);
            });
        };
    }])

    .directive('ntLoadingIndicator', function () {
        return function (scope) {
            NProgress.configure({ ease: 'ease', speed: 500 });

            scope.$on('ntLoadingStart', function () {
                NProgress.start();
            });
            scope.$on('ntLoadingEnd', function () {
                NProgress.done();
            });
        };
    })

    .factory('currentVideo', ['getSet', function (getSet) {
        return getSet();
    }])

    .controller('HomeCtrl', ['$scope', '$rootScope', '$location', 'ytSearch', 'ytFeed', 'TPL_PATH',
        function ($scope, $rootScope, $location, ytSearch, ytFeed, TPL_PATH) {

            var layout;
            $scope.setLayout = function (l) {
                layout = l;
            };

            $scope.isLayout = function (l) {
                return layout == l;
            };

            function hasLocationChanged() {
                return $location.path().indexOf('watch') >= 0;
            };

            $scope.$watchCollection(function () {
                return $location.search();
            }, function (data) {

                //do not reload the results if the location changed to
                //the watch page
                if (hasLocationChanged()) return;

                $scope.setLayout('pictures');

                var c = data.c;
                if (c && c.length > 0) {
                    $scope.searchTerm = c;
                    $scope.searchMethod = 'category';
                } else {
                    data.q = data.q || 'AngularJS';
                    $scope.searchMethod = 'query';
                    $scope.searchTerm = data.q;
                }

                $rootScope.$broadcast('ntLoadingStart');

                ytSearch(data).then(function (videos) {
                    $scope.videos = videos;
                    $rootScope.$broadcast('ntLoadingEnd');
                });

                ytFeed('most_popular').then(function (videos) {
                    $scope.popularVideos = videos;
                });
            });
        }])

    .filter('limit', function () {
        return function (results, limit) {
            return results && results.slice(0, limit);
        };
    })

    .controller('CategoryListCtrl', ['$scope', 'appCategories',
        function ($scope, appCategories) {
            var cats = appCategories();
            if (cats) {
                cats.then(function (categories) {
                    $scope.categories = categories;
                });
            }
        }])

    .controller('SearchFormCtrl', ['$scope', '$location',
        function ($scope, $location) {

            $scope.search = function () {
                var order, category, q = $scope.q;
                if ($scope.advanced) {
                    order = $scope.advanced.orderby;
                    category = $scope.advanced.category;
                }

                $scope.advanced = false;

                $location.search({
                    q: q || '',
                    c: category || '',
                    o: order || ''
                }).path('/');
            };

            $scope.$on('$routeChangeStart', function () {
                $scope.advanced = false;
            });

            $scope.orderingOptions = [
                'relevance',
                'published',
                'viewCount',
                'rating',
                'position',
                'commentCount',
                'published',
                'reversedPosition',
                'title',
                'viewCount'
            ];
        }])

    .controller('WatchCtrl', ['$scope', '$rootScope', '$location', 'videoInstance', 'TPL_PATH', 'currentVideo', 'ytSearch', 'ytRelatedVideos',
        function ($scope, $rootScope, $location, videoInstance, TPL_PATH, currentVideo, ytSearch, ytRelatedVideos) {

            var videoID = videoInstance.id;
            $scope.video_id = videoID;
            $scope.video = videoInstance;

            currentVideo(videoInstance);

            ytRelatedVideos(videoID).then(function (videos) {
                $scope.relatedVideos = videos;
                $rootScope.$broadcast('ntLoadingEnd');
            });

            $scope.$on('$destroy', function () {
                currentVideo(null);
            });

            // [M5.3] Listen for the `commentRemoved` event in `WatchCtrl` and update `$scope.commentRemoved` to `true`.
            // HINT $scope.$on('...');
        }])

    .controller('CommentsCtrl', ['$scope', 'ytVideoComments', 'currentVideo',
        function ($scope, ytVideoComments, currentVideo) {
            var video = currentVideo();
            ytVideoComments(video.id).then(function (comments) {
                $scope.comments = comments;
            });

            // [M5.3] Complete `removeComment` in `CommentsCtrl` so that comments can be removed.
            $scope.removeComment = function (comment) {
                // [M5.3] Upon comment removal, communicate with the parent controller (`WatchCtrl`) using the event name `commentRemoved`.
                // HINT $scope.$emit('...');
            };
        }])

    .controller('VideoPanelCtrl', ['$scope', 'currentVideo',
        function ($scope, currentVideo) {

            $scope.video = currentVideo();
        }]);
