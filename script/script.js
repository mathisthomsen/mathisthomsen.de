$( document ).ready(function() {

    $(function() {
	about();
    });


    $('#contact').click(function() {
        $( ".slider-wrap" ).addClass('active');
        $( "#header" ).addClass('active');
    });

    $('#back').click(function() {
        $( ".slider-wrap" ).removeClass('active');
        $( "#header" ).removeClass('active');
    });

    $('#music').click(function() {
        $( ".overlay-music" ).addClass('active');
    });

    $('#close-music').click(function() {
        $( ".overlay-music" ).removeClass('active');
    });

    $('#web').click(function() {
        $( ".overlay-web" ).addClass('active');
    });

    $('#close-web').click(function() {
        $( ".overlay-web" ).removeClass('active');
    });


    function about() {

        $('.slide').first().addClass('visible');
        $('.next, .prev').click(function() {

            var $this = $(this),
                curActive = $('.about-slider').find('.visible'),
                position = $('.about-slider').children().index(curActive),
                num = $('.slide').length;

            if($this.hasClass('next')) {

                if(position < num -1){
                  $('.visible').removeClass('visible').next().addClass('visible');
                }
                else {
                  $('.slide').removeClass('visible').first().addClass('visible');
                }

              } else {

                if (position === 0) {
                  $('.slide').removeClass('visible').last().addClass('visible');
                }
                else {
                  $('.visible').removeClass('visible').prev().addClass('visible');
                }
              }
    });
}

});
