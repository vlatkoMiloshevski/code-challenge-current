# CURRENT – Technical challange

Create an application using Ionic Framework and Angular consuming dataset from [endpoint](https://dummyjson.com/c/a8f2-a16e-4e37-a9d6) to display map (you can use any map library of your choice) with markers for each station with following functionalities:

1. Display station details and connectors statuses on marker click (fetch station details from [endpoint](https://dummyjson.com/c/dc70-4ec5-44d3-9b41)).
  * Try to utilize as many properties as possible.
  * Handle loading, error, and empty states when fetching station details.
2. Filter stations based on status or types of connectors.
  * Save the filters in the local storage so that they persist across sessions.
3. Search for address.
  * Use a suitable geocoding service to convert the address into coordinates for map display.
4. Show user's current location on the map.
  * Handle permission requests and errors when accessing the user's location.
5. Cluster nearby stations on the map.
  * Provide a clear visual representation of clustered stations and allow users to interact with clusters to view individual stations.
6. Favorites functionality to mark and view favorite stations and connectors.
  * Persist favorite stations and connectors in the local storage so that they are available across sessions.
7. URL-driven state
  * The selected station, search query, filters, and favorites view should be reflected in the URL where appropriate.
8. Responsive behavior
  * The application should provide an appropriate experience on both desktop and mobile.
  * On mobile, consider using Ionic components such as ion-modal, ion-sheet, or ion-popover for station details rather than simply displaying a desktop-style panel.
9. Have performance optimizations in place.
  * The application should be scalable to handle 10000+ station efficiently.
10. Implement test cases
  * Ensure that critical functionalities such as fetching station details, filtering, searching, and favorites are covered by tests.
  * Consider using Angular's testing utilities and frameworks like Jasmine and Karma for unit and integration tests.

The application will be rated based on the following criteria:

1. Correctness and completeness of the implemented functionalities.
2. User interface and user experience with focus on the usage of Ionic Framework components.
3. Code quality and maintainability.
4. Performance and responsiveness of the application.
5. Quality of technical decisions and trade-offs.
6. Appropriate use of Angular and Ionic capabilities.
7. Ability to identify edge cases and design for future requirements.
8. Clear reasoning behind architectural and implementation choices.

Include a short README explaining the project setup, structure, and usage instructions.

The project needs to run at least as a web app, but provides both desktop and mobile experiences.

The task is recommended to be completed within a few hours to demonstrate your skills effectively. The complete project can be delivered as a Git repository or a zip file containing the source code.