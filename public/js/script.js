const hamburger = document.getElementById('hamburger-menu');
const navLinks = document.getElementById('nav-links');
const navItems = document.querySelectorAll('#nav-links a');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('nav-active');
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (navLinks.classList.contains('nav-active')) {
            navLinks.classList.remove('nav-active');
        }
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const carousel = document.getElementById('heroCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    
    if (!carousel || !dotsContainer) return;

    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    let currentIndex = 1; // Start on Slide 2 (Index 1)

    // 1. Generate the dots
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i === 1) dot.classList.add('active'); // Highlight 2nd dot initially
        dotsContainer.appendChild(dot);

        // Click a dot to go to that slide
        dot.addEventListener('click', () => {
            currentIndex = i;
            scrollToCurrent();
        });
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    // 2. Jump to the 2nd slide immediately on load
    setTimeout(() => {
        carousel.scrollTo({
            left: slides[1].offsetLeft,
            behavior: 'auto' 
        });
    }, 100);

    // 3. Helper function to handle the scrolling and dot updating
    function scrollToCurrent() {
        carousel.scrollTo({
            left: slides[currentIndex].offsetLeft,
            behavior: 'smooth'
        });
        
        dots.forEach(d => d.classList.remove('active'));
        if(dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    // 4. Update dots if the user swipes/scrolls manually
    carousel.addEventListener('scroll', () => {
        let minDiff = Infinity;
        slides.forEach((slide, i) => {
            const diff = Math.abs(carousel.scrollLeft - slide.offsetLeft);
            if (diff < minDiff) {
                minDiff = diff;
                currentIndex = i; // Keep our variable in sync with manual scrolling
            }
        });
        dots.forEach(d => d.classList.remove('active'));
        if(dots[currentIndex]) dots[currentIndex].classList.add('active');
    });

    // 5. The Infinite Auto-Scroll Loop
    setInterval(() => {
        currentIndex++;
        
        // If we go past the last slide, loop back to the first (Index 0)
        if (currentIndex >= slides.length) {
            currentIndex = 0; 
        }
        
        scrollToCurrent();
    }, 3500); // Changes slide every 3.5 seconds
});