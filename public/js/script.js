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

    // Get original slides
    const originalSlides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const totalOriginals = originalSlides.length;
    if (totalOriginals < 2) return;

    // Clone first and last slide for seamless infinite scroll
    const firstClone = originalSlides[0].cloneNode(true);
    const lastClone = originalSlides[totalOriginals - 1].cloneNode(true);

    // Prepend last clone and append first clone
    carousel.insertBefore(lastClone, originalSlides[0]);
    carousel.appendChild(firstClone);

    // Refresh slides array (now contains: [lastClone, S1, S2, S3, S4, firstClone])
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    let currentIndex = 1; // Start on Slide 1 (Index 1, which is the original first slide)
    let isAutoScrolling = false;
    let autoScrollInterval;

    // Generate the dots (only for original slides)
    originalSlides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i === 0) dot.classList.add('active'); // Highlight first dot initially
        dotsContainer.appendChild(dot);

        // Click a dot to go to that slide
        dot.addEventListener('click', () => {
            currentIndex = i + 1; // Map to the offset index
            scrollToCurrent();
            startAutoScroll(); // Reset the timer
        });
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    // Jump to the original first slide (Index 1) immediately on load
    setTimeout(() => {
        carousel.scrollTo({
            left: slides[1].offsetLeft,
            behavior: 'auto' 
        });
    }, 50);

    // Helper function to handle the scrolling and dot updating
    function scrollToCurrent(smooth = true) {
        isAutoScrolling = true;
        carousel.scrollTo({
            left: slides[currentIndex].offsetLeft,
            behavior: smooth ? 'smooth' : 'auto'
        });
        
        // Map current index back to original dots index (0 to totalOriginals - 1)
        let dotIndex = currentIndex - 1;
        if (currentIndex === 0) {
            dotIndex = totalOriginals - 1;
        } else if (currentIndex === slides.length - 1) {
            dotIndex = 0;
        }
        
        dots.forEach(d => d.classList.remove('active'));
        if (dots[dotIndex]) dots[dotIndex].classList.add('active');

        // Reset the flag after smooth scroll finishes
        setTimeout(() => {
            isAutoScrolling = false;
        }, 600);
    }

    // Handle seamless transition jump after scroll finishes
    function handleTransitionEnd() {
        if (currentIndex === 0) {
            // Jump from lastClone (Index 0) to actual last slide (Index totalOriginals)
            currentIndex = totalOriginals;
            carousel.scrollTo({
                left: slides[currentIndex].offsetLeft,
                behavior: 'auto'
            });
        } else if (currentIndex === slides.length - 1) {
            // Jump from firstClone (Index slides.length - 1) to actual first slide (Index 1)
            currentIndex = 1;
            carousel.scrollTo({
                left: slides[currentIndex].offsetLeft,
                behavior: 'auto'
            });
        }
    }

    // Listen to scroll to update dots manually, and handle seamless jump on end
    let scrollTimeout;
    carousel.addEventListener('scroll', () => {
        if (isAutoScrolling) {
            // During auto-scroll, check if we need to jump after transition finishes
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                handleTransitionEnd();
            }, 600);
            return;
        }

        // Handle manual scrolling updates
        let minDiff = Infinity;
        let closestIndex = currentIndex;
        slides.forEach((slide, i) => {
            const diff = Math.abs(carousel.scrollLeft - slide.offsetLeft);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });
        
        currentIndex = closestIndex;
        
        let dotIndex = currentIndex - 1;
        if (currentIndex === 0) {
            dotIndex = totalOriginals - 1;
        } else if (currentIndex === slides.length - 1) {
            dotIndex = 0;
        }
        
        dots.forEach(d => d.classList.remove('active'));
        if (dots[dotIndex]) dots[dotIndex].classList.add('active');

        // Check if we need to jump seamlessly (if the user stopped scrolling)
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            handleTransitionEnd();
        }, 150);

        // Reset auto-scroll timer on manual interaction
        startAutoScroll();
    });

    // Auto-Scroll Loop Controls
    function startAutoScroll() {
        if (autoScrollInterval) clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            if (isAutoScrolling) return;
            currentIndex++;
            scrollToCurrent(true);
        }, 3500); // Changes slide every 3.5 seconds
    }

    // Start auto-scrolling
    startAutoScroll();

    // ==========================================
    // AJAX Live Search Autocomplete
    // ==========================================
    const searchInput = document.getElementById('header-search-input');
    const autocompleteResults = document.getElementById('search-autocomplete-results');

    if (searchInput && autocompleteResults) {
        let debounceTimeout;

        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            const query = searchInput.value.trim();

            if (query.length < 2) {
                autocompleteResults.style.display = 'none';
                autocompleteResults.innerHTML = '';
                return;
            }

            debounceTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/v1/search-autocomplete?q=${encodeURIComponent(query)}`);
                    const data = await response.json();

                    if (data.success && data.data.length > 0) {
                        autocompleteResults.innerHTML = '';
                        data.data.forEach(product => {
                            const itemDiv = document.createElement('div');
                            itemDiv.style.padding = '8px 12px';
                            itemDiv.style.cursor = 'pointer';
                            itemDiv.style.borderBottom = '1px solid #f5f5f5';
                            itemDiv.style.display = 'flex';
                            itemDiv.style.alignItems = 'center';
                            itemDiv.style.gap = '10px';
                            itemDiv.style.backgroundColor = '#fff';

                            const activePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) 
                                ? product.discountPrice 
                                : product.price;

                            const priceHtml = product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
                                ? `<span style="font-weight: 600; color: var(--brand-orange); font-size: 11px;">Rs. ${activePrice}</span>
                                   <span style="text-decoration: line-through; color: #999; font-size: 10px;">Rs. ${product.price}</span>`
                                : `<span style="font-weight: 600; color: #333; font-size: 11px;">Rs. ${product.price}</span>`;

                            itemDiv.innerHTML = `
                                <img src="${product.image}" alt="${product.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 600; color: #333; line-height: 1.2; text-align: left;">${product.name}</div>
                                    <div style="font-size: 10px; color: #777; margin-bottom: 2px; text-align: left;">in ${product.category}</div>
                                    <div style="display: flex; gap: 6px; align-items: center; justify-content: flex-start;">${priceHtml}</div>
                                </div>
                            `;

                            itemDiv.addEventListener('click', () => {
                                window.location.href = `/products/${product._id}`;
                            });

                            // Hover effects
                            itemDiv.addEventListener('mouseenter', () => {
                                itemDiv.style.backgroundColor = '#fafafa';
                            });
                            itemDiv.addEventListener('mouseleave', () => {
                                itemDiv.style.backgroundColor = '#fff';
                            });

                            autocompleteResults.appendChild(itemDiv);
                        });
                        autocompleteResults.style.display = 'block';
                    } else {
                        autocompleteResults.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error fetching autocomplete results:', error);
                }
            }, 250); // Debounce delay
        });

        // Hide dropdown on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && !autocompleteResults.contains(e.target)) {
                autocompleteResults.style.display = 'none';
            }
        });

        // Re-show dropdown if input has value on focus
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && autocompleteResults.children.length > 0) {
                autocompleteResults.style.display = 'block';
            }
        });
    }

    // ==========================================
    // Dynamic Animated Toast Notifications
    // ==========================================
    const toastContainer = document.getElementById('toast-container');

    window.showToast = function(message, type = 'success') {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.style.pointerEvents = 'auto';
        toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
        toast.style.color = '#fff';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.style.fontFamily = "'Montserrat', sans-serif";

        const icon = type === 'success' 
            ? '<i class="fa-solid fa-circle-check"></i>' 
            : '<i class="fa-solid fa-circle-exclamation"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Slide in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Slide out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    };

    // Load any flash message toast hooks
    const flashHooks = document.querySelectorAll('.flash-toast-hook');
    flashHooks.forEach(hook => {
        const type = hook.getAttribute('data-type');
        const message = hook.getAttribute('data-message');
        if (message) {
            window.showToast(message, type);
        }
    });

});