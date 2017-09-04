$(function () {

  console.log('Page loaded');
  
  var client = algoliasearch('CRPE6G3HL1', '7abe7d73cf6d7873077c5dd2ca85d92a');
  var helper = algoliasearchHelper(client, 'restaurants_list', {
    facets: ['food_type', 'rounded_stars_count', 'payment_options'],
    aroundLatLngViaIP: true
  });

  helper.on('result', function(content) {
    renderCuisineList(content);
    renderHits(content);
    renderSearchStats(content);
    renderPaymentOptionsList(content);
    renderRatingsList(content);
  });

  function renderStars(starsCount) {
    let starsHTML = ''
    for(let i=0; i < 5; i++) {
      if(i < Math.floor(starsCount)) starsHTML += '<img class="star" src="../../resources/graphics/starsPlain.png">';
      if(i >=  Math.floor(starsCount)) starsHTML += '<img class="star" src="../../resources/graphics/starEmpty.png">';
    } 
    console.log(starsHTML)
    return starsHTML;
  }

  function renderSearchStats(content) {
    $('#results-stats').html(function() {
      return '<p>' + content.nbHits + ' results found </p><p style="font-size:90%">in ' + (content.processingTimeMS * .01) + ' seconds</p>';
    });
  }

  function renderHits(content) {
    $('#results-list').html(function() {
      return $.map(content.hits, function(hit) {
        return '<li> <div class="restaurant"><div class="row"><div class="col-sm-3"><img class="restaurantImage" src=' + hit._highlightResult.image_url.value + '></div><div class="restaurantInfo"><div class="row"><div class="col"><h1>' + hit._highlightResult.name.value + '</h1></div></div><div class="row"><div class="col"><h2>' + hit._highlightResult.stars_count.value + '</h2> ' + renderStars(hit._highlightResult.stars_count.value) + ' (' + hit._highlightResult.reviews_count.value + ' reviews)</div></div><div class="row"><div class="col">' + hit._highlightResult.food_type.value + ' | ' + hit._highlightResult.neighborhood.value + ' | ' + hit._highlightResult.price_range.value + '</div></div></div></div></div></li>';
      });
    });
  }

  function renderCuisineList(content) {
    $('#cuisines').html(function() {
      return $.map(content.getFacetValues('food_type'), function(facet) {
        return $('<li class="cuisine">').append('<h2>' + facet.name + '</h2>').append('<h3>' + facet.count + '</h3>');
      });
    });
  }

  $('#cuisines').on('click', 'li', function(e) {
    var facetValue = $(this).text().replace(/[0-9]/g, '');
    helper.toggleFacetRefinement('food_type', facetValue)
          .search();
  });

  function renderPaymentOptionsList(content) {
    $('#payment-options').html(function() {
      return $.map(content.getFacetValues('payment_options'), function(facet) {
        if(facet.name === 'Diners Club' || facet.name === 'JCB' || facet.name === 'Carte Blanche') return '';
        return $('<li class="payment-option">').append('<h2>' + facet.name + '</h2>').append('<h3>' + facet.count + '</h3>');
      });
    });
  }

  $('#payment-options').on('click', 'li', function(e) {
    var facetValue = $(this).text().replace(/[0-9]/g, '');
    // alter line below to return JCB, Carte Blanche, Diners Club along with Discover
    if(facetValue === 'Discover') facetValue = 'Discover';
    helper.toggleFacetRefinement('payment_options', facetValue)
          .search();
  });

  function renderRatingsList(content) {
    $('#ratings').html(function() {
      return $.map([0,1,2,3,4,5], function(num) {
        let stars = renderStars(num);
        return $('<li class="rating" id='+num+'>').append(stars);
      });
    });
  }

  $('#ratings').on('click', 'li', function(e) {
    var facetValue = $(this).attr('id').toString();
    helper.toggleFacetRefinement('rounded_stars_count', facetValue)
          .search();
  });

  $('#search-box').on('keyup', function() {
    helper.setQuery($(this).val())
      .search();
  });

  $('#show-more').on('click', function() {
    helper.nextPage()
      .search();
  });


  helper.search();
});
