Feature: Home page

  Scenario: The page loads the stations and the filters
    Given the station service returns the sample stations
    When I open the home page
    Then the page title is "CURRENT"
    And the stations are loaded

  Scenario: The page shows an empty state when there are no stations
    Given the station list is empty
    When I open the home page
    Then I see the message "No charging stations found."

  Scenario: The page shows an error and retries when the station service fails
    Given the station service fails on the first request only
    When I open the home page
    Then I see the message "Could not reach the station service. Check your connection."
    When I click "Try again"
    Then the stations are loaded

  Scenario: Filters from the URL are applied
    Given the station service returns the sample stations
    When I open the home page with the URL "status=closed&connectors=CHAdeMO"
    Then I see the message "No stations match the selected filters."
    And the "Clear filters" button is visible

  Scenario: Selecting a status and a connector that no station has shows no matches
    Given the station service returns the sample stations
    When I open the home page
    And I open the Filters panel
    And I select the filter "Full"
    And I select the filter "Type - 2"
    Then I see the message "No stations match the selected filters."
    When I click "Clear filters"
    Then I do not see the message "No stations match the selected filters."

  Scenario: The favorites view is empty until a station is starred
    Given the station service returns the sample stations
    When I open the home page
    And I turn on the favorites switch
    Then I see the message "No favorites yet. Star a station or a charge point to see it here."

  Scenario: A station opens its details panel from the URL
    Given the station service returns the sample stations
    When I open the home page with the URL "station=1"
    Then the details panel shows the station "Alpha Charge"
    And the details panel lists the charge point "Point A"

  Scenario: The address search shows results after the user pauses typing
    Given the station service returns the sample stations
    And the address search returns the sample results
    When I open the home page
    And I search for the address "Karl Johans gate"
    Then the address result "Karl Johans gate, Oslo, Norway" is shown
