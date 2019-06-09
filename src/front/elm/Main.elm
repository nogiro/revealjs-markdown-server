module Main exposing (main)

import Browser
import Html exposing (Html, button, div, text)
import Html.Events exposing (onClick)

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias Model = Int

init : Int -> ( Model, Cmd msg )
init flags =
  ( flags , Cmd.none )


-- UPDATE

type Msg = Increment | Decrement

update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
  case msg of
    Increment ->
      ( model + 1, Cmd.none )

    Decrement ->
      ( model - 1, Cmd.none )


-- VIEW

view : Model -> Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , div [] [ text (String.fromInt model) ]
    , button [ onClick Increment ] [ text "+" ]
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

